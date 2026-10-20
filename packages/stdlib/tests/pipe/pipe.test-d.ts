import { describe, expectTypeOf, it } from "bun:test"
import { pipe } from "../../src/pipe"

describe("pipe", () => {
    it("should act as identity with 0 functions", () => {
        const data = { a: "hello", b: 123 }
        expectTypeOf(pipe(data)).toEqualTypeOf(data)
    })

    it("should handle type transformations", () => {
        expectTypeOf(pipe(
            0,
            (num) => String(num),
            (str) => [str],
        )).toEqualTypeOf<string[]>()
    })
})
