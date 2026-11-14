import { describe, expect, expectTypeOf, it } from "bun:test"
import { from } from "../../src/Error/from"

describe("Error.from", () => {
    it("should return an Error as it is", () => {
        const error = new TypeError("Nope")
        expect(from(error)).toBe(error)
        expect(error.name).toBe("TypeError")
        expect(error.message).toBe("Nope")
    })

    it("should fill in a missing name and message in a copy", () => {
        const error = new TypeError("x")
        error.name = ""
        Object.assign(error, { code: 3, message: 3 })
        const fixed = from(error) as TypeError & { code: number }
        expect(fixed).not.toBe(error)
        expect(fixed).toBeInstanceOf(TypeError)
        expect(fixed.name).toBe("TypeError")
        expect(fixed.message).toBe("")
        expect(fixed.code).toBe(3)
        expect(error.name).toBe("")
    })

    it("should not change the error it is given", () => {
        const error = new Error("x", { cause: "y" })
        const fixed = from(error)
        expect(error.cause).toBe("y")
        expect(fixed.cause).toBeInstanceOf(Error)
        expect((fixed.cause as Error).message).toBe("y")
        expect(fixed.message).toBe("x")
        expect(fixed.stack).toBe(error.stack)
    })

    it("should keep the type of an error, anything else is an Error", () => {
        expectTypeOf(from(new TypeError("x"))).toEqualTypeOf<TypeError>()
        expectTypeOf(from("x" as unknown)).toEqualTypeOf<Error>()
        expectTypeOf(from("x" as RangeError | string)).toEqualTypeOf<RangeError | Error>()
    })

    it("should turn anything else into the message", () => {
        expect(from("Not found").message).toBe("Not found")
        expect(from(3).message).toBe("3")
        expect(from(null).message).toBe("null")
        expect(from(undefined).message).toBe("undefined")
        expect(from(Symbol("x")).message).toBe("Symbol(x)")
    })

    it("should take the name and message of a plain object, and keep its other fields", () => {
        const error = from({ email: "jane@miko.dev", message: "Already a member", name: "TakenError" })
        expect(error).toBeInstanceOf(Error)
        expect(error.name).toBe("TakenError")
        expect(error.message).toBe("Already a member")
        expect((error as Error & { email: string }).email).toBe("jane@miko.dev")
        expect(Object.keys(error)).toEqual(["email"])
    })

    it("should keep the fields of a plain object without a message", () => {
        const error = from({ code: 3 })
        expect(error.name).toBe("Error")
        expect(error.message).toBe("")
        expect((error as Error & { code: number }).code).toBe(3)
    })

    it("should turn the cause and the errors of an AggregateError into errors", () => {
        const error = from({ cause: "Connection refused", message: "Query failed" })
        expect(error.cause).toBeInstanceOf(Error)
        expect((error.cause as Error).message).toBe("Connection refused")
        const aggregate = from(new AggregateError([new Error("one"), "two"], "Several failed")) as AggregateError
        expect(aggregate.errors.map((item: Error) => item.message)).toEqual(["one", "two"])
        expect(aggregate.errors[1]).toBeInstanceOf(Error)
    })

    it("should stop at a cause it has seen before", () => {
        const error = new Error("loop")
        error.cause = error
        expect(from(error).cause).toBe(error)
    })

    it("should not throw for values that throw when they are read", () => {
        const hostile = Object.defineProperty({}, "message", { enumerable: true, get: () => { throw new Error("nope") } })
        expect(from(hostile) instanceof Error).toBe(true)
        const nameless = new Error("x")
        Object.defineProperty(nameless, "name", { get: () => { throw new Error("nope") } })
        const named = from(nameless)
        expect(named === nameless).toBe(false)
        expect(named.name).toBe("Error")
        expect(from(Object.freeze(new Error("frozen"))).message).toBe("frozen")
    })
})
