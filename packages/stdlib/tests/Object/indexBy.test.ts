import { describe, expect, it } from "bun:test"
import { indexBy } from "../../src/Object/indexBy"

describe("Object.indexBy", () => {
    it("should create an object by key", () => {
        const a = { id: "a" }
        const b = { id: "b" }
        expect(indexBy([a, b], (item) => item.id)).toEqual({ a, b })
        expect(indexBy(new Set([a]), (item, index) => `${item.id}${index}`)).toEqual({ a0: a })
        expect(indexBy([], () => "a")).toEqual({})
    })

    it("should keep the last item of a key", () => {
        expect(indexBy([{ id: "a", n: 1 }, { id: "a", n: 2 }], (item) => item.id)).toEqual({ a: { id: "a", n: 2 } })
    })

    it("should treat every key like any other", () => {
        const result = indexBy([{ id: "__proto__" }], (item) => item.id)
        expect(Object.keys(result)).toEqual(["__proto__"])
        expect(Object.getPrototypeOf(result)).toBe(Object.prototype)
    })
})
