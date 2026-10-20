import { describe, expect, it } from "bun:test"
import { safeStringify } from "../../src/JSON/safeStringify"
import { tryParse } from "../../src/JSON/tryParse"
import { tryStringify } from "../../src/JSON/tryStringify"

function fail(): never {
    throw new Error("no")
}

describe("JSON.tryParse", () => {
    it("should parse", () => {
        expect(tryParse(`{"a":[1,null]}`).unwrap()).toEqual({ a: [1, null] })
        expect(tryParse("null").unwrap()).toBeNull()
    })

    it("should fail with what parsing throws", () => {
        for (const text of ["", "{", "undefined", "{'a':1}"]) {
            const result = tryParse(text)
            expect(result.ok).toBe(false)
            expect(result.value).toBeInstanceOf(SyntaxError)
        }
    })
})

describe("JSON.tryStringify", () => {
    it("should stringify", () => {
        expect(tryStringify({ a: [1, null] }).unwrap()).toBe(`{"a":[1,null]}`)
        expect(tryStringify(null).unwrap()).toBe("null")
    })

    it("should fail for what can not be written as JSON", () => {
        const circular: Record<string, unknown> = {}
        circular["self"] = circular
        const thrower = {
            toJSON() {
                throw "no"
            },
        }
        for (const value of [circular, { a: 1n }, undefined, () => {}, Symbol("a"), thrower]) {
            const result = tryStringify(value)
            expect(result.ok).toBe(false)
            expect(result.value).toBeInstanceOf(Error)
        }
        expect((tryStringify(thrower).value as Error).cause).toBe("no")
    })
})

describe("JSON.safeStringify", () => {
    it("should be JSON.stringify for what can be written as JSON", () => {
        for (const value of [{ a: [1, null, "b"], c: { d: true } }, [1, 2], "a", 1, null, new Date(0), { a: undefined, b: () => {} }]) {
            expect(safeStringify(value)).toBe(JSON.stringify(value))
        }
    })

    it("should be null for what is nothing", () => {
        expect(safeStringify(undefined)).toBe("null")
        expect(safeStringify(() => {})).toBe("null")
        expect(safeStringify(Symbol("a"))).toBe("null")
    })

    it("should write a bigint as its digits", () => {
        expect(safeStringify({ id: 12345678901234567890n, list: [1n] })).toBe(`{"id":"12345678901234567890","list":["1"]}`)
        expect(safeStringify(1n)).toBe(`"1"`)
    })

    it("should leave out an object inside of itself, and nothing else", () => {
        const node: Record<string, unknown> = { name: "a" }
        node["self"] = node
        node["list"] = [node, 1]
        node["child"] = { parent: node, value: 1n }
        expect(safeStringify(node)).toBe(`{"name":"a","list":[null,1],"child":{"value":"1"}}`)

        // The same object twice is not inside of itself.
        const shared = { id: 1n }
        expect(safeStringify({ a: shared, b: shared })).toBe(`{"a":{"id":"1"},"b":{"id":"1"}}`)
    })

    it("should leave out what throws when it is read", () => {
        const value = {
            id: 1n,
            nested: { toJSON: fail },
            ok: 1,
            get broken(): never {
                throw new Error("no")
            },
        }
        expect(safeStringify(value)).toBe(`{"id":"1","ok":1}`)
        expect(safeStringify({ toJSON: fail })).toBe("null")
    })

    it("should use toJSON", () => {
        expect(safeStringify({ at: new Date(0), id: 1n })).toBe(`{"at":"1970-01-01T00:00:00.000Z","id":"1"}`)
        expect(safeStringify({ id: 1n, value: { toJSON: () => ({ big: 2n }) } })).toBe(`{"id":"1","value":{"big":"2"}}`)
    })

    it("should not be confused by a key of __proto__", () => {
        const value = JSON.parse(`{"__proto__":{"a":1},"id":1}`) as Record<string, unknown>
        value["big"] = 1n
        expect(safeStringify(value)).toBe(`{"__proto__":{"a":1},"id":1,"big":"1"}`)
    })

    it("should never throw", () => {
        let deep: unknown = 1n
        for (let i = 0; i < 100_000; i++) deep = [deep]
        expect(safeStringify(deep)).toBe("null")
        expect(safeStringify(new Proxy({}, { ownKeys: fail }))).toBe("null")
    })
})
