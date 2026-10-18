import type { Scrollbar } from "../src/useScrollbar"
import { beforeEach, describe, expect, it, jest } from "bun:test"
import { act } from "react"
import { useScrollbar } from "../src/useScrollbar"
import { fakeDOM, render } from "./dom"

fakeDOM()

let scrollElement: HTMLElement
let contentElement: HTMLElement
let scrollbar: Scrollbar

beforeEach(() => {
    scrollElement = document.createElement("div")
    contentElement = document.createElement("div")
    Object.defineProperty(scrollElement, "clientHeight", { configurable: true, value: 100 })
    Object.defineProperty(scrollElement, "scrollHeight", { configurable: true, value: 400 })
    render(() => {
        scrollbar = useScrollbar(scrollElement, contentElement)
        return null
    })
})

describe("useScrollbar", () => {
    it("should follow the scroll position", () => {
        expect(scrollbar.$overflows()).toBe(true)
        expect(scrollbar.$ratio()).toBe(0.25)
        expect(scrollbar.$progress()).toBe(0)
        scrollElement.scrollTop = 150
        act(() => scrollElement.dispatchEvent(new Event("scroll")))
        expect(scrollbar.$progress()).toBe(0.5)
    })

    it("should scroll to a progress", () => {
        scrollbar.scrollTo(1)
        expect(scrollElement.scrollTop).toBe(300)
    })

    it("should be scrolling until 500ms after the last scroll", () => {
        jest.useFakeTimers()
        try {
            act(() => scrollElement.dispatchEvent(new Event("scroll")))
            expect(scrollbar.$scrolling()).toBe(true)
            jest.advanceTimersByTime(400)
            act(() => scrollElement.dispatchEvent(new Event("scroll")))
            jest.advanceTimersByTime(400)
            expect(scrollbar.$scrolling()).toBe(true)
            jest.advanceTimersByTime(100)
            expect(scrollbar.$scrolling()).toBe(false)
        }
        finally {
            jest.useRealTimers()
        }
    })

    it("should be hovered while the pointer is over the element", () => {
        scrollElement.dispatchEvent(new Event("pointerenter"))
        expect(scrollbar.$hovered()).toBe(true)
        scrollElement.dispatchEvent(new Event("pointerleave"))
        expect(scrollbar.$hovered()).toBe(false)
    })
})
