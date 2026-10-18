import { describe, expect, it, vi } from "bun:test"
import { Effect } from "../../src/Effect"
import { AsyncEmitter, Emitter } from "../../src/Emitter"
import { Signal } from "../../src/Signal"

/** What the plugin passes during development, and what a module being replaced does with it. */
function replaceModule(hmr: Set<() => void>): void {
    for (const callback of hmr) {
        hmr.delete(callback)
        callback()
    }
}

describe("hmr", () => {
    it("should dispose effects when their module is replaced", () => {
        const hmr = new Set<() => void>()
        const $a = Signal(0)
        const spy = vi.fn(() => void $a())
        const watched = vi.fn()
        Effect(spy, { hmr })
        Effect.watch($a, watched, undefined, { hmr })
        expect(hmr.size).toBe(2)

        replaceModule(hmr)
        $a(1)

        expect(hmr.size).toBe(0)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(watched).toHaveBeenCalledTimes(0)
    })

    it("should dispose emitters when their module is replaced", () => {
        const hmr = new Set<() => void>()
        const onTick = Emitter(undefined, { hmr })
        const onTock = AsyncEmitter(undefined, { hmr })
        onTick(() => {})
        onTock(async () => {})

        replaceModule(hmr)

        expect(onTick.listeners.size).toBe(0)
        expect(onTock.listeners.size).toBe(0)
    })

    it("should not keep what has been disposed", () => {
        const hmr = new Set<() => void>()
        const effect = Effect(() => {}, { hmr })
        const onTick = Emitter(undefined, { hmr })
        expect(hmr.size).toBe(2)
        effect.dispose()
        onTick.dispose()
        expect(hmr.size).toBe(0)
    })

    it("should do nothing without it", () => {
        const $a = Signal(0)
        const spy = vi.fn(() => void $a())
        Effect(spy, {})
        const onTick = Emitter(undefined, undefined)
        onTick(() => {})
        $a(1)
        expect(spy).toHaveBeenCalledTimes(2)
        expect(onTick.listeners.size).toBe(1)
    })
})
