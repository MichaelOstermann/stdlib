import { describe, expect, expectTypeOf, it } from "bun:test"
import { sentenceCase } from "../../src/String/sentenceCase"

describe("String.sentenceCase", () => {
    it("should convert", () => {
        expect(sentenceCase("firstName")).toBe("First name")
        expect(sentenceCase("hello-world")).toBe("Hello world")
        expect(sentenceCase("HELLO_WORLD")).toBe("Hello world")
        expect(sentenceCase("")).toBe("")
    })

    it("should type the result", () => {
        expectTypeOf(sentenceCase("firstName")).toEqualTypeOf<"First name">()
        expectTypeOf(sentenceCase("HELLO_WORLD")).toEqualTypeOf<"Hello world">()
    })
})
