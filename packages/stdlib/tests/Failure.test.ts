import { describe, expect, expectTypeOf, it } from "bun:test"
import { Failure } from "../src/Failure"

describe("Failure.from", () => {
    it("should keep the name, message, stack and other JSON fields of an error", () => {
        const error = Object.assign(new TypeError("Could not add the member"), { status: 503, notJSON: () => {} })
        const failure = Failure.from(error)
        expect(failure).toEqual({ message: "Could not add the member", name: "TypeError", stack: error.stack!, status: 503 })
    })

    it("should turn the cause and the errors of an AggregateError into failures", () => {
        const failure = Failure.from(new AggregateError([new Error("one"), "two"], "Several failed", { cause: { code: 3 } }))
        expect(failure.errors?.map(({ message, name }) => ({ message, name }))).toEqual([{ message: "one", name: "Error" }, { message: "two", name: "Error" }])
        expect(failure.cause).toEqual({ code: 3, message: "", name: "Error" })
    })

    it("should keep the name, message and other JSON fields of a plain object", () => {
        expect(Failure.from({ email: "jane@miko.dev", message: "Already a member", name: "TakenError" })).toEqual({
            email: "jane@miko.dev",
            message: "Already a member",
            name: "TakenError",
        })
    })

    it("should give back a failure with the same fields", () => {
        type TakenError = { cause: Failure, email: string, message: string, name: "TakenError" }
        const failure: TakenError = { cause: { message: "Duplicate key", name: "Error" }, email: "jane@miko.dev", message: "Already a member", name: "TakenError" }
        expect(Failure.from(failure)).toEqual(failure)
        expectTypeOf(Failure.from(failure)).toEqualTypeOf<typeof failure>()
        expectTypeOf(Failure.from(failure as typeof failure | string)).toEqualTypeOf<typeof failure | Failure>()
    })

    it("should keep the name of an object as it is written", () => {
        expectTypeOf(Failure.from({ message: "Bar", name: "Foo" })).toEqualTypeOf<{ message: string, name: "Foo" }>()
        expectTypeOf(Failure.from(new TypeError("Bar"))).toEqualTypeOf<Failure>()
        expectTypeOf(Failure.from("Bar" as unknown)).toEqualTypeOf<Failure>()
    })

    it("should give back the type of an object that is a failure, and Failure for anything else", () => {
        expectTypeOf(Failure.from({ email: "jane@miko.dev", message: "Bar", name: "TakenError" })).toEqualTypeOf<{ email: string, message: string, name: "TakenError" }>()
        expectTypeOf(Failure.from({ message: "Bar", name: "Foo", notJSON: () => {} })).toEqualTypeOf<Failure>()
    })

    it("should leave out the fields that are not JSON all the way down", () => {
        const failure = Failure.from({ date: new Date(), message: "", name: "Test", nested: { ok: 1, set: new Set() }, set: new Set() })
        expect(failure).toEqual({ message: "", name: "Test" })

        const shared = { ok: 1 }
        const cycle: Record<string, unknown> = {}
        cycle["self"] = cycle
        expect(Failure.from({ a: shared, b: [shared, shared], cycle, list: [1, "two", null, { three: true }], message: "", name: "Test" })).toEqual({
            a: shared,
            b: [shared, shared],
            list: [1, "two", null, { three: true }],
            message: "",
            name: "Test",
        })
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

describe("Failure.toError", () => {
    it("should return an Error as it is", () => {
        const error = new RangeError("out")
        expect(Failure.toError(error)).toBe(error)
    })

    it("should turn anything else into a Failure first", () => {
        const error = Failure.toError("Not found")
        expect(error).toBeInstanceOf(Error)
        expect(error.name).toBe("Error")
        expect(error.message).toBe("Not found")
        expect(error.stack).toBeString()
    })

    it("should keep the name and the other fields, and turn cause and errors into errors", () => {
        const failure = {
            cause: { message: "Duplicate key", name: "SQLiteError" },
            email: "a@b.c",
            errors: [{ message: "a", name: "A" }],
            message: "Already a member",
            name: "TakenError",
            stack: "TakenError: Already a member\n    at somewhere",
        }
        const error = Failure.toError(failure)
        expect(error).toBeInstanceOf(AggregateError)
        expect(error.name).toBe("TakenError")
        expect(error.stack).toBe(failure.stack)
        expect((error as Error & { email: string }).email).toBe("a@b.c")
        expect(error.cause).toBeInstanceOf(Error)
        expect((error.cause as Error).name).toBe("SQLiteError")
        expect((error as AggregateError).errors[0]).toBeInstanceOf(Error)
    })

    it("should be undone by Failure.from", () => {
        const failure = {
            cause: { code: 19, message: "Duplicate key", name: "SQLiteError" },
            email: "a@b.c",
            message: "Already a member",
            name: "TakenError",
        }
        expect(Failure.removeStackTraces(Failure.from(Failure.toError(failure)))).toEqual(failure)
    })

    it("should not let a field change the prototype", () => {
        const error = Failure.toError(JSON.parse(`{"name":"A","message":"b","__proto__":{"polluted":true}}`))
        expect(error).toBeInstanceOf(Error)
        expect((error as Error & { polluted?: boolean }).polluted).toBeUndefined()
    })
})
