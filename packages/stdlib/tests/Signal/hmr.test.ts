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
        const effect = Effect(spy, { hmr })
        const watcher = Effect.watch($a, watched, undefined, { hmr })
        expect(hmr.size).toBe(2)

        replaceModule(hmr)
        $a(1)

        expect([effect.disposed, watcher.disposed]).toEqual([true, true])
        expect(hmr.size).toBe(0)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(watched).toHaveBeenCalledTimes(0)
    })

    it("should dispose emitters when their module is replaced", () => {
        const hmr = new Set<() => void>()
        const onTick = Emitter(undefined, { hmr })
        const onTock = AsyncEmitter(undefined, { hmr })
        onTick(() => {})

        replaceModule(hmr)

        expect([onTick.disposed, onTock.disposed]).toEqual([true, true])
        expect(onTick.listeners.size).toBe(0)
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
        expect(Effect(() => {}, {}).disposed).toBe(false)
        expect(Emitter(undefined, undefined).disposed).toBe(false)
    })
})
