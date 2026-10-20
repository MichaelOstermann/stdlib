import type { UseVirtualizerOptions, Virtualizer } from "../src/useVirtualizer"
import { beforeEach, describe, expect, it, vi } from "bun:test"
import { act, useState } from "react"
import { useVirtualizer } from "../src/useVirtualizer"
import { fakeDOM, render } from "./dom"

fakeDOM()

let element: HTMLElement
let virtualizer: Virtualizer
let setOptions: (options: UseVirtualizerOptions) => void
const renders = vi.fn()

beforeEach(() => {
    renders.mockClear()
    element = document.createElement("div")
    Object.defineProperty(element, "clientHeight", { configurable: true, value: 100 })
})

function mount(options: UseVirtualizerOptions): void {
    render(() => {
        renders()
        const [current, set] = useState(options)
        setOptions = set
        virtualizer = useVirtualizer(element, current)
        return null
    })
}

function scroll(top: number): void {
    element.scrollTop = top
    act(() => element.dispatchEvent(new Event("scroll")))
}

const indices = (): number[] => virtualizer.items.map((item) => item.index)

describe("useVirtualizer", () => {
    it("should render the items in view and the overscan", () => {
        mount({ count: 100, overscan: 1, size: 20 })
        expect(virtualizer.height).toBe(2000)
        expect(indices()).toEqual([0, 1, 2, 3, 4, 5])
        expect(virtualizer.items[2]).toEqual({ index: 2, size: 20, start: 40 })
        scroll(500)
        expect(indices()).toEqual([24, 25, 26, 27, 28, 29, 30])
        scroll(1950)
        expect(indices()).toEqual([96, 97, 98, 99])
    })

    it("should only render again when other items come into view", () => {
        mount({ count: 100, overscan: 0, size: 20 })
        scroll(1)
        expect(indices()).toEqual([0, 1, 2, 3, 4, 5])
        const before = renders.mock.calls.length
        scroll(2)
        scroll(19)
        expect(renders).toHaveBeenCalledTimes(before)
        scroll(20)
        expect(renders).toHaveBeenCalledTimes(before + 1)
        expect(indices()).toEqual([1, 2, 3, 4, 5])
    })

    it("should size each item with a function", () => {
        mount({ count: 4, size: (index) => (index + 1) * 10 })
        expect(virtualizer.height).toBe(100)
        expect(virtualizer.items.map((item) => item.start)).toEqual([0, 10, 30, 60])
    })

    it("should move the items from the gap down", () => {
        mount({ count: 10, gap: { index: 2, size: 50 }, size: 20 })
        expect(virtualizer.height).toBe(250)
        expect(virtualizer.items.slice(1, 3)).toEqual([{ index: 1, size: 20, start: 20 }, { index: 2, size: 20, start: 90 }])
        act(() => setOptions({ count: 10, gap: { index: 10, size: 50 }, size: 20 }))
        expect(virtualizer.height).toBe(250)
    })

    it("should follow a shorter list", () => {
        mount({ count: 100, overscan: 0, size: 20 })
        scroll(1000)
        act(() => setOptions({ count: 3, overscan: 0, size: 20 }))
        expect(virtualizer.height).toBe(60)
        expect(indices()).toEqual([])
        scroll(0)
        expect(indices()).toEqual([0, 1, 2])
    })

    it("should scroll as little as needed to an item", () => {
        mount({ count: 100, overscan: 0, size: 20 })
        act(() => virtualizer.scrollToIndex(10))
        expect(element.scrollTop).toBe(120)
        expect(indices()).toEqual([6, 7, 8, 9, 10])
        act(() => virtualizer.scrollToIndex(8))
        expect(element.scrollTop).toBe(120)
        act(() => virtualizer.scrollToIndex(6, 20))
        expect(element.scrollTop).toBe(100)
        expect(indices()).toEqual([5, 6, 7, 8, 9])
    })
})
