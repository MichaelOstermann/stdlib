import type { Root } from "react-dom/client"
import { describe, expect, it, vi } from "bun:test"
import { act, createElement, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { useMountEffect } from "../src/useMountEffect"
import { useUnmountEffect } from "../src/useUnmountEffect"
import { useUpdateEffect } from "../src/useUpdateEffect"
import { fakeDOM } from "./dom"

fakeDOM()

/** Renders `component` with `props`, again with each call of the returned function, until `unmount`. */
function mount<P extends object>(component: (props: P) => null, props: P, strict = false): { rerender: (props: P) => void, unmount: () => Promise<void> } {
    const root: Root = createRoot(document.createElement("div"))
    const element = (props: P) => strict ? createElement(StrictMode, null, createElement(component, props)) : createElement(component, props)
    act(() => root.render(element(props)))
    return {
        rerender: props => act(() => root.render(element(props))),
        // The microtask of `useUnmountEffect` runs before `act` returns.
        unmount: async () => act(async () => root.unmount()),
    }
}

describe("useMountEffect", () => {
    it("should run on mount and clean up on unmount, not on renders between", async () => {
        const cleanup = vi.fn()
        const effect = vi.fn(() => cleanup)
        const { rerender, unmount } = mount((_: { value: number }) => {
            useMountEffect(effect)
            return null
        }, { value: 1 })
        rerender({ value: 2 })
        expect(effect).toHaveBeenCalledTimes(1)
        expect(cleanup).not.toHaveBeenCalled()
        await unmount()
        expect(cleanup).toHaveBeenCalledTimes(1)
    })
})

describe("useUnmountEffect", () => {
    it("should call the effect of the last render once unmounted", async () => {
        const calls: number[] = []
        const { rerender, unmount } = mount(({ value }: { value: number }) => {
            useUnmountEffect(() => calls.push(value))
            return null
        }, { value: 1 })
        rerender({ value: 2 })
        expect(calls).toEqual([])
        await unmount()
        expect(calls).toEqual([2])
    })

    it("should not call the effect when StrictMode mounts again", async () => {
        const effect = vi.fn()
        const { unmount } = mount(() => {
            useUnmountEffect(effect)
            return null
        }, {}, true)
        await act(async () => {})
        expect(effect).not.toHaveBeenCalled()
        await unmount()
        expect(effect).toHaveBeenCalledTimes(1)
    })
})

describe("useUpdateEffect", () => {
    for (const strict of [false, true]) {
        it(`should skip the mount and run when the deps change${strict ? ", in StrictMode" : ""}`, async () => {
            const cleanup = vi.fn()
            const effect = vi.fn(() => cleanup)
            const { rerender, unmount } = mount(({ value }: { value: number }) => {
                useUpdateEffect(effect, [value])
                return null
            }, { value: 1 }, strict)
            expect(effect).not.toHaveBeenCalled()
            rerender({ value: 1 })
            expect(effect).not.toHaveBeenCalled()
            rerender({ value: 2 })
            expect(effect).toHaveBeenCalledTimes(1)
            rerender({ value: 3 })
            expect(effect).toHaveBeenCalledTimes(2)
            expect(cleanup).toHaveBeenCalledTimes(1)
            await unmount()
            expect(cleanup).toHaveBeenCalledTimes(2)
        })
    }
})
