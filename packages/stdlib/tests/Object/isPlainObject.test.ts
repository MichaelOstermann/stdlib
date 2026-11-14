import { describe, expect, it } from "bun:test"
import { isPlainObject } from "../../src/Object/isPlainObject"

describe("Object.isPlainObject", () => {
    it("should be true for objects written as { … } and made without a prototype", () => {
        expect(isPlainObject({})).toBe(true)
        expect(isPlainObject({ a: 1 })).toBe(true)
        expect(isPlainObject(Object.create(null))).toBe(true)
    })

    it("should be false for everything else", () => {
        class Point {}
        expect(isPlainObject([])).toBe(false)
        expect(isPlainObject(new Point())).toBe(false)
        expect(isPlainObject(new Date())).toBe(false)
        expect(isPlainObject(new Map())).toBe(false)
        expect(isPlainObject(new Error("x"))).toBe(false)
        expect(isPlainObject(Object.create({}))).toBe(false)
        expect(isPlainObject(null)).toBe(false)
        expect(isPlainObject("a")).toBe(false)
        expect(isPlainObject(() => {})).toBe(false)
    })
})
