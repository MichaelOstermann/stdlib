import { describe, expect, it } from "bun:test"
import { distance } from "../../src/String/distance"

describe("String.distance", () => {
    it("should be 0 for the same strings", () => {
        expect(distance("members", "members")).toBe(0)
        expect(distance("", "")).toBe(0)
    })

    it("should count added, removed and replaced characters", () => {
        expect(distance("membrs", "members")).toBe(1)
        expect(distance("members", "membrs")).toBe(1)
        expect(distance("nembers", "members")).toBe(1)
        expect(distance("", "add")).toBe(3)
        expect(distance("add", "")).toBe(3)
    })

    it("should count two characters next to each other that are swapped as one", () => {
        expect(distance("membres", "members")).toBe(1)
        expect(distance("ab", "ba")).toBe(1)
    })
})
