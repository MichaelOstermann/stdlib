import { describe, expect, it } from "bun:test"
import { useObserveSize } from "../src/useObserveSize"
import { fakeDOM, render } from "./dom"

fakeDOM()

describe("useObserveSize", () => {
    it("should call onChange with the size right away", () => {
        const element = document.createElement("div")
        Object.defineProperty(element, "offsetHeight", { value: 20 })
        Object.defineProperty(element, "offsetWidth", { value: 30 })
        const heights: number[] = []
        render(() => {
            useObserveSize(element, size => heights.push(size.height))
            return null
        })
        expect(heights).toEqual([20])
    })
})
