import type { Ref } from "react"
import { Signal } from "@monstermann/stdlib"
import { describe, expect, it, vi } from "bun:test"
import { act, createElement, createRef } from "react"
import { createRoot } from "react-dom/client"
import { mergeRefs } from "../src/mergeRefs"
import { fakeDOM } from "./dom"

fakeDOM()

/** Renders a `div` with `ref`, again with each call of `rerender`, until `unmount`. */
function mount(ref: () => Ref<HTMLDivElement>): { rerender: () => void, unmount: () => void } {
    const root = createRoot(document.createElement("div"))
    const render = () => act(() => root.render(createElement("div", { ref: ref() })))
    render()
    return { rerender: render, unmount: () => act(() => root.unmount()) }
}

describe("mergeRefs", () => {
    it("should set object refs and call callback refs, then reset them", () => {
        const object = createRef<HTMLDivElement>()
        const callback = vi.fn()
        const { unmount } = mount(() => mergeRefs(object, callback))
        expect(object.current).toBeInstanceOf(HTMLDivElement)
        expect(callback).toHaveBeenLastCalledWith(object.current)
        unmount()
        expect(object.current).toBeNull()
        expect(callback).toHaveBeenLastCalledWith(null)
    })

    it("should call the cleanup of a callback ref instead of calling it with null", () => {
        const cleanup = vi.fn()
        const callback = vi.fn(() => cleanup)
        const object = createRef<HTMLDivElement>()
        const { unmount } = mount(() => mergeRefs(callback, object))
        unmount()
        expect(callback).toHaveBeenCalledTimes(1)
        expect(cleanup).toHaveBeenCalledTimes(1)
    })

    it("should write a signal", () => {
        const $element = Signal<HTMLDivElement | null>(null)
        const object = createRef<HTMLDivElement>()
        const { unmount } = mount(() => mergeRefs($element, object))
        expect($element()).toBe(object.current)
        unmount()
        expect($element()).toBeNull()
    })

    it("should not attach again while the merged ref is the same", () => {
        const callback = vi.fn()
        const merged = mergeRefs(callback, createRef<HTMLDivElement>())
        const { rerender } = mount(() => merged)
        rerender()
        expect(callback).toHaveBeenCalledTimes(1)
    })

    it("should return a single ref as is, and null for none", () => {
        const object = createRef<HTMLDivElement>()
        expect(mergeRefs(undefined, object, null)).toBe(object)
        expect(mergeRefs<HTMLDivElement>(undefined, null)).toBeNull()
    })
})
