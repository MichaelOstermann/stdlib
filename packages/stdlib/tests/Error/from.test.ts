import { describe, expect, it } from "bun:test"
import { from } from "../../src/Error/from"

describe("Error.from", () => {
    it("should return an Error as it is", () => {
        const error = new TypeError("Nope")
        expect(from(error)).toBe(error)
        expect(error.name).toBe("TypeError")
        expect(error.message).toBe("Nope")
    })

    it("should fill in a missing name and message", () => {
        const error = new Error("x")
        error.name = ""
        Object.assign(error, { message: 3 })
        expect(from(error).name).toBe("Error")
        expect(from(error).message).toBe("")
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
        expect(from(nameless) === nameless).toBe(true)
        expect(from(Object.freeze(new Error("frozen"))).message).toBe("frozen")
    })
})
