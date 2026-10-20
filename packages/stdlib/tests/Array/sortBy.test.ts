import { describe, expect, it } from "bun:test"
import { sortBy } from "../../src/Array/sortBy"
import { sortByLocale } from "../../src/Array/sortByLocale"

describe("Array.sortBy", () => {
    it("should sort by what is returned", () => {
        expect(sortBy([3, 1, 2], (value) => value)).toEqual([1, 2, 3])
        expect(sortBy([10, 9, 1], (value) => value)).toEqual([1, 9, 10])
        expect(sortBy([new Date(2), new Date(1)], (date) => date)).toEqual([new Date(1), new Date(2)])
        expect(sortBy(["b", "a", "B"], (text) => text)).toEqual(["B", "a", "b"])
        expect(sortBy([{ id: 2 }, { id: 1 }], (item) => item.id)).toEqual([{ id: 1 }, { id: 2 }])
    })

    it("should sort the other way around", () => {
        expect(sortBy([3, 1, 2], (value) => value, { order: "desc" })).toEqual([3, 2, 1])
        expect(sortBy([3, 1, 2], (value) => value, { order: "asc" })).toEqual([1, 2, 3])
    })

    it("should keep the order of what is the same, in both directions", () => {
        const items = [{ id: "a", rank: 1 }, { id: "b", rank: 0 }, { id: "c", rank: 1 }, { id: "d", rank: 0 }]
        expect(sortBy(items, (item) => item.rank).map((item) => item.id)).toEqual(["b", "d", "a", "c"])
        expect(sortBy(items, (item) => item.rank, { order: "desc" }).map((item) => item.id)).toEqual(["a", "c", "b", "d"])
    })

    it("should return what it was given when it is sorted already", () => {
        const target = [1, 2, 2, 3]
        expect(sortBy(target, (value) => value)).toBe(target)
        expect(sortBy([] as number[], (value) => value)).toEqual([])
        const result = sortBy(target, (value) => value, { order: "desc" })
        expect(result).not.toBe(target)
        expect(target).toEqual([1, 2, 2, 3])
    })

    it("should change what it was given when asked to", () => {
        const target = [3, 1, 2]
        expect(sortBy(target, (value) => value, { mut: true })).toBe(target)
        expect(target).toEqual([1, 2, 3])
    })

    it("should only ask once for each element", () => {
        let calls = 0
        sortBy([5, 4, 3, 2, 1], (value) => {
            calls++
            return value
        })
        expect(calls).toBe(5)
    })
})

describe("Array.sortByLocale", () => {
    it("should sort text the way a language does", () => {
        expect(sortByLocale(["b", "ä", "A", "a"], (text) => text, { locales: "de" })).toEqual(["a", "A", "ä", "b"])
        expect(sortByLocale(["ä", "z"], (text) => text, { locales: "sv" })).toEqual(["z", "ä"])
        expect(sortByLocale([{ title: "b" }, { title: "a" }], (note) => note.title)).toEqual([{ title: "a" }, { title: "b" }])
    })

    it("should take the options of Intl.Collator", () => {
        expect(sortByLocale(["v10", "v2"], (text) => text, { locales: "en" })).toEqual(["v10", "v2"])
        expect(sortByLocale(["v10", "v2"], (text) => text, { numeric: true })).toEqual(["v2", "v10"])
        expect(sortByLocale(["a", "A", "á"], (text) => text, { locales: "en", sensitivity: "base" })).toEqual(["a", "A", "á"])
    })

    it("should sort the other way around, keeping the order of what is the same", () => {
        expect(sortByLocale(["a", "c", "b"], (text) => text, { order: "desc" })).toEqual(["c", "b", "a"])
        const items = [{ id: 1, title: "a" }, { id: 2, title: "b" }, { id: 3, title: "a" }]
        expect(sortByLocale(items, (item) => item.title, { order: "desc" }).map((item) => item.id)).toEqual([2, 1, 3])
    })

    it("should return what it was given when it is sorted already, and change it when asked to", () => {
        const sorted = ["a", "b"]
        expect(sortByLocale(sorted, (text) => text)).toBe(sorted)
        const target = ["b", "a"]
        expect(sortByLocale(target, (text) => text, { mut: true })).toBe(target)
        expect(target).toEqual(["a", "b"])
    })
})
