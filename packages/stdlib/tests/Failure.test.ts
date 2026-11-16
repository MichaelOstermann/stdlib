import { describe, expect, expectTypeOf, it } from "bun:test"
import { Failure } from "../src/Failure"

describe("Failure.from", () => {
    it("should keep the name, message and stack of an error, and its fields that are JSON as meta", () => {
        const error = Object.assign(new TypeError("Could not add the member"), { status: 503, notJSON: () => {} })
        const failure = Failure.from(error)
        expect(failure).toEqual({ message: "Could not add the member", meta: { status: 503 }, name: "TypeError", stack: error.stack! })
    })

    it("should turn the cause and the errors of an AggregateError into failures", () => {
        const failure = Failure.from(new AggregateError([new Error("one"), "two"], "Several failed", { cause: { code: 3 } }))
        expect(failure.errors?.map(({ message, name }) => ({ message, name }))).toEqual([{ message: "one", name: "Error" }, { message: "two", name: "Error" }])
        expect(failure.cause).toEqual({ message: "", meta: { code: 3 }, name: "Error" })
    })

    it("should take the name and message of a plain object, and the rest as meta", () => {
        expect(Failure.from({ email: "jane@miko.dev", message: "Already a member", name: "TakenError" })).toEqual({
            message: "Already a member",
            meta: { email: "jane@miko.dev" },
            name: "TakenError",
        })
    })

    it("should give back a failure with the same fields", () => {
        type TakenError = { cause: Failure, message: string, meta: { email: string }, name: "TakenError" }
        const failure: TakenError = { cause: { message: "Duplicate key", name: "Error" }, message: "Already a member", meta: { email: "jane@miko.dev" }, name: "TakenError" }
        expect(Failure.from(failure)).toEqual(failure)
        expectTypeOf(Failure.from(failure)).toEqualTypeOf<typeof failure>()
        expectTypeOf(Failure.from(failure as typeof failure | string)).toEqualTypeOf<typeof failure | Failure>()
    })

    it("should turn anything else into the message", () => {
        expect(Failure.from("Not found")).toEqual({ message: "Not found", name: "Error" })
        expect(Failure.from(3)).toEqual({ message: "3", name: "Error" })
        expect(Failure.from(null)).toEqual({ message: "null", name: "Error" })
        expect(Failure.from(Object.create(null))).toEqual({ message: "", name: "Error" })
    })

    it("should not change what it is given, and stop at a cause it has seen before", () => {
        const error = new Error("Loop", { cause: "y" })
        const loop = new Error("Loop")
        loop.cause = loop
        expect(Failure.from(error).cause).toEqual({ message: "y", name: "Error" })
        expect(error.cause).toBe("y")
        expect(Failure.from(loop).cause).toBeUndefined()
    })

    it("should not throw for values that throw when they are read", () => {
        const hostile = Object.defineProperty({}, "message", { enumerable: true, get: () => { throw new Error("nope") } })
        expect(Failure.from(hostile)).toEqual({ message: "", name: "Error" })
        const nameless = new Error("x")
        Object.defineProperty(nameless, "name", { get: () => { throw new Error("nope") } })
        expect(Failure.from(nameless).name).toBe("Error")
    })
})

describe("Failure.removeStackTraces", () => {
    it("should remove the stacks of the failure, its cause and errors, in a copy", () => {
        const failure = Failure.from(new AggregateError([new Error("one")], "Could not save", { cause: new Error("fetch failed") }))
        const removed = Failure.removeStackTraces(failure)
        expect(JSON.stringify(removed)).not.toContain("stack")
        expect(failure.stack).toBeDefined()
        expect(removed.cause?.message).toBe("fetch failed")
        expect(failure.cause?.stack).toBeDefined()
    })

    it("should not change a failure without a stack", () => {
        const failure: Failure = { cause: Failure.from(new Error("fetch failed")), message: "Could not save", name: "SaveError" }
        Failure.removeStackTraces(failure)
        expect(failure.cause?.stack).toBeDefined()
    })
})
