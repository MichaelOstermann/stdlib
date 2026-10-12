import { describe, expect, it, vi } from "bun:test"
import { effect, indexed, memo, signal } from "./helpers"

describe("memo", () => {
    it("should call equals with the previous value first", () => {
        const a = signal(1)
        const equals = vi.fn((before: number, after: number) => before === after)
        const m = memo(() => a() * 2, { equals })

        expect(m()).toBe(2)
        expect(equals).toHaveBeenCalledTimes(0)

        a(2)
        expect(m()).toBe(4)
        expect(equals).toHaveBeenCalledWith(2, 4)
    })

    it("should keep the previous value when equal", () => {
        const a = signal({ id: 1, name: "a" })
        const m = memo(() => ({ id: a().id }), { equals: (a, b) => a.id === b.id })
        const spy = vi.fn(() => void m())
        effect(spy)
        const before = m()

        a({ id: 1, name: "b" })
        expect(m()).toBe(before)
        expect(spy).toHaveBeenCalledTimes(1)

        a({ id: 2, name: "b" })
        expect(m()).toEqual({ id: 2 })
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should not call equals for identical values", () => {
        const a = signal(0)
        const value = {}
        const equals = vi.fn(() => true)
        const m = memo(() => {
            a()
            return value
        }, { equals })

        m()
        a(1)
        m()

        expect(equals).toHaveBeenCalledTimes(0)
    })

    it("should rethrow what the computation throws", () => {
        const promise = Promise.resolve()
        const m = memo(() => {
            throw promise
        })
        let thrown
        try {
            m()
        }
        catch (error) {
            thrown = error
        }
        expect(thrown).toBe(promise)
    })
})

describe("indexed", () => {
    type Item = { id: number, name: string }

    it("should index by key", () => {
        const items = signal<Item[]>([{ id: 1, name: "a" }, { id: 2, name: "b" }])
        const names = indexed(items, item => [item.id, item.name])

        expect(names()).toEqual(new Map([[1, "a"], [2, "b"]]))
        expect(names.get(1)).toBe("a")
        expect(names.get(3)).toBe(undefined)
        expect(names.for(2)()).toBe("b")
        expect(names.for(2)).toBe(names.for(2))
    })

    it("should reuse the previous index when nothing changed", () => {
        const items = signal<Item[]>([{ id: 1, name: "a" }, { id: 2, name: "b" }])
        const names = indexed(items, item => [item.id, item.name])
        const spy = vi.fn(() => void names())
        effect(spy)
        const before = names()

        items([{ id: 1, name: "a" }, { id: 2, name: "b" }])
        expect(names()).toBe(before)
        expect(spy).toHaveBeenCalledTimes(1)

        items([{ id: 1, name: "a" }, { id: 2, name: "c" }])
        expect(names()).not.toBe(before)
        expect(names.get(2)).toBe("c")
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should notice added and removed keys", () => {
        const items = signal<Item[]>([{ id: 1, name: "a" }])
        const names = indexed(items, item => [item.id, item.name])

        items([{ id: 1, name: "a" }, { id: 2, name: "b" }])
        expect(names().size).toBe(2)

        items([{ id: 2, name: "b" }])
        expect(Array.from(names().keys())).toEqual([2])

        items([{ id: 3, name: "b" }])
        expect(Array.from(names().keys())).toEqual([3])
    })

    it("should distinguish a missing key from an undefined value", () => {
        const items = signal<{ id: number, name?: string }[]>([{ id: 1 }])
        const names = indexed(items, item => [item.id, item.name])
        const before = names()

        items([{ id: 2 }])
        expect(names()).not.toBe(before)
        expect(names().has(2)).toBe(true)
    })

    it("should call equals with the previous value first", () => {
        const items = signal<Item[]>([{ id: 1, name: "a" }])
        const equals = vi.fn((before: Item, after: Item) => before.name === after.name)
        const index = indexed(items, item => [item.id, item], { equals })
        const before = index()

        const next = { id: 1, name: "a" }
        items([next])
        expect(index()).toBe(before)
        expect(equals).toHaveBeenCalledWith(before.get(1)!, next)

        items([{ id: 1, name: "b" }])
        expect(index()).not.toBe(before)
    })

    it("should keep the values of equal entries when another entry changes", () => {
        const make = (changed: number): Item[] => Array.from({ length: 5 }, (_, id) => ({ id, name: id === changed ? "changed" : "same" }))
        const items = signal(make(-1))
        const index = indexed(items, item => [item.id, item], { equals: (before, after) => before.name === after.name })
        const spies = Array.from({ length: 5 }, (_, id) => {
            const entry = index.for(id)
            const spy = vi.fn(() => void entry())
            effect(spy)
            return spy
        })
        const before = index.get(0)

        items(make(3))

        expect(index.get(0)).toBe(before)
        expect(index.get(3)?.name).toBe("changed")
        expect(spies.map(spy => spy.mock.calls.length)).toEqual([1, 1, 1, 2, 1])
    })
})
