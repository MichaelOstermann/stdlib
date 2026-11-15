import type { JSONObject } from "../src/JSON/types"
import { describe, expect, expectTypeOf, it } from "bun:test"
import { Failure } from "../src/Failure"

describe("Failure.of", () => {
    it("should make a failure with the stack of where it was made", () => {
        const failure = Failure.of("TakenError", "Already a member")
        expect(failure.name).toBe("TakenError")
        expect(failure.message).toBe("Already a member")
        expect(failure.stack).toStartWith("TakenError: Already a member\n    at ")
        expect(failure.stack).toContain("Failure.test.ts")
        expect(failure.stack).not.toContain("Failure.ts")
    })

    it("should turn the cause and errors into failures", () => {
        const failure = Failure.of("SaveError", "Could not save", { cause: new TypeError("fetch failed"), errors: ["one"] })
        expect(failure.cause).toMatchObject({ message: "fetch failed", name: "TypeError" })
        expect(failure.errors).toEqual([{ message: "one", name: "Error" }])
    })

    it("should know its name and meta", () => {
        const failure = Failure.of("HttpError", "Server is busy", { meta: { status: 503 } })
        expectTypeOf(failure).toEqualTypeOf<Failure<"HttpError", { status: number }>>()
        expect(failure.meta).toEqual({ status: 503 })
    })

    it("should have a meta when it is typed", () => {
        expectTypeOf<Failure<"HttpError", { status: number }>["meta"]>().toEqualTypeOf<{ status: number }>()
        expectTypeOf<Failure<"HttpError">["meta"]>().toEqualTypeOf<JSONObject | undefined>()
    })

    it("should survive JSON", () => {
        const failure = Failure.of("TakenError", "Already a member", { cause: "Duplicate key", meta: { email: "jane@miko.dev" } })
        expect(JSON.parse(JSON.stringify(failure))).toEqual(failure)
    })
})

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
        const failure = Failure.of("TakenError", "Already a member", { cause: "Duplicate key", meta: { email: "jane@miko.dev" } })
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
        const failure = Failure.of("SaveError", "Could not save", { cause: new Error("fetch failed"), errors: [new Error("one")] })
        const removed = Failure.removeStackTraces(failure)
        expect(JSON.stringify(removed)).not.toContain("stack")
        expect(failure.stack).toBeDefined()
        expect(removed.cause?.message).toBe("fetch failed")
        expect(failure.cause?.stack).toBeDefined()
    })

    it("should not change a failure without a stack", () => {
        const failure: Failure = { cause: Failure.of("FetchError", "fetch failed"), message: "Could not save", name: "SaveError" }
        Failure.removeStackTraces(failure)
        expect(failure.cause?.stack).toBeDefined()
    })
})
