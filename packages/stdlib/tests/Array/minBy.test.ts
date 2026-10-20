import { describe, expect, it } from "bun:test"
import { maxBy } from "../../src/Array/maxBy"
import { minBy } from "../../src/Array/minBy"

describe("Array.minBy, Array.maxBy", () => {
    const users = [{ name: "b", score: 2 }, { name: "a", score: 1 }, { name: "c", score: 3 }, { name: "d", score: 1 }, { name: "e", score: 3 }]

    it("should return the element with the lowest, and the highest value", () => {
        expect(minBy(users, (user) => user.score)?.name).toBe("a")
        expect(maxBy(users, (user) => user.score)?.name).toBe("c")
        expect(minBy([3, 1, 2], (value) => value)).toBe(1)
        expect(maxBy([3, 1, 2], (value) => value)).toBe(3)
    })

    it("should compare strings and dates", () => {
        expect(minBy(users, (user) => user.name)?.name).toBe("a")
        expect(maxBy(users, (user) => user.name)?.name).toBe("e")
        const dates = [new Date(3), new Date(1), new Date(2)]
        expect(minBy(dates, (date) => date)).toBe(dates[1])
        expect(maxBy(dates, (date) => date)).toBe(dates[0])
    })

    it("should return nothing without elements", () => {
        expect(minBy([] as number[], (value) => value)).toBeUndefined()
        expect(maxBy([] as number[], (value) => value)).toBeUndefined()
    })

    it("should pass the index, and the array", () => {
        const target = ["a", "b", "c"]
        expect(maxBy(target, (_, index, array) => array === target ? index : -1)).toBe("c")
        expect(minBy(target, (_, index) => -index)).toBe("c")
    })
})
