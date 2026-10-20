import { describe, expect, it } from "bun:test"
import { pipe } from "../../src/pipe"

describe("pipe", () => {
    it("should pass through data with 0 functions", () => {
        expect(pipe(1)).toBe(1)
    })

    it("should pipe 1 operation", () => {
        expect(pipe(
            1,
            (x) => x + 1,
        )).toBe(2)
    })

    it("should pipe 2 operations", () => {
        expect(pipe(
            1,
            (x) => x + 1,
            (x) => x + 2,
        )).toBe(4)
    })

    it("should pipe 3 operations", () => {
        expect(pipe(
            1,
            (x) => x + 1,
            (x) => x + 2,
            (x) => x + 3,
        )).toBe(7)
    })

    it("should pipe 4 operations", () => {
        expect(pipe(
            1,
            (x) => x + 1,
            (x) => x + 2,
            (x) => x + 3,
            (x) => x + 4,
        )).toBe(11)
    })

    it("should pipe 5 operations", () => {
        expect(pipe(
            1,
            (x) => x + 1,
            (x) => x + 2,
            (x) => x + 3,
            (x) => x + 4,
            (x) => x + 5,
        )).toBe(16)
    })

    it("should pipe 6 operations", () => {
        expect(pipe(
            1,
            (x) => x + 1,
            (x) => x + 2,
            (x) => x + 3,
            (x) => x + 4,
            (x) => x + 5,
            (x) => x + 6,
        )).toBe(22)
    })

    it("should pipe 7 operations", () => {
        expect(pipe(
            1,
            (x) => x + 1,
            (x) => x + 2,
            (x) => x + 3,
            (x) => x + 4,
            (x) => x + 5,
            (x) => x + 6,
            (x) => x + 7,
        )).toBe(29)
    })

    it("should pipe 8 operations", () => {
        expect(pipe(
            1,
            (x) => x + 1,
            (x) => x + 2,
            (x) => x + 3,
            (x) => x + 4,
            (x) => x + 5,
            (x) => x + 6,
            (x) => x + 7,
            (x) => x + 8,
        )).toBe(37)
    })

    it("should pipe 9 operations", () => {
        expect(pipe(
            1,
            (x) => x + 1,
            (x) => x + 2,
            (x) => x + 3,
            (x) => x + 4,
            (x) => x + 5,
            (x) => x + 6,
            (x) => x + 7,
            (x) => x + 8,
            (x) => x + 9,
        )).toBe(46)
    })

    it("should pipe 10 operations", () => {
        expect(pipe(
            1,
            (x) => x + 1,
            (x) => x + 2,
            (x) => x + 3,
            (x) => x + 4,
            (x) => x + 5,
            (x) => x + 6,
            (x) => x + 7,
            (x) => x + 8,
            (x) => x + 9,
            (x) => x + 10,
        )).toBe(56)
    })
})
