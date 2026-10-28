import { describe, expectTypeOf, it } from "bun:test"
import { partition } from "../src/Array/partition"
import { unique } from "../src/Array/unique"
import { delete as deleteKey } from "../src/Map/delete"
import { set } from "../src/Map/set"
import { defaults } from "../src/Object/defaults"
import { omit } from "../src/Object/omit"
import { add } from "../src/Set/add"

declare const mixed: (number | string)[]
declare const mutableMap: Map<string, number>
declare const readonlyMap: ReadonlyMap<string, number>
declare const mutableSet: Set<number>
declare const readonlySet: ReadonlySet<number>

describe("types", () => {
    it("should partition by type guards", () => {
        expectTypeOf(partition(mixed, (value) => typeof value === "string")).toEqualTypeOf<[string[], number[]]>()
        expectTypeOf(partition(mixed, (value) => value !== 1)).toEqualTypeOf<[(number | string)[], (number | string)[]]>()
    })

    it("should return something mutable for something mutable", () => {
        expectTypeOf(set(mutableMap, "a", 1)).toEqualTypeOf<Map<string, number>>()
        expectTypeOf(deleteKey(mutableMap, "a")).toEqualTypeOf<Map<string, number>>()
        expectTypeOf(add(mutableSet, 1)).toEqualTypeOf<Set<number>>()
        expectTypeOf(unique(mixed)).toEqualTypeOf<(number | string)[]>()
    })

    it("should return something readonly for something readonly", () => {
        expectTypeOf(set(readonlyMap, "a", 1)).toEqualTypeOf<ReadonlyMap<string, number>>()
        expectTypeOf(add(readonlySet, 1)).toEqualTypeOf<ReadonlySet<number>>()
    })

    it("should reject what does not fit", () => {
        // @ts-expect-error not a key
        set(mutableMap, 1, 1)
        // @ts-expect-error not a value
        set(mutableMap, "a", "b")
        // @ts-expect-error not a value
        add(mutableSet, "a")
    })

    it("should omit", () => {
        expectTypeOf(omit({ a: 1, b: "b" }, ["a"])).toEqualTypeOf<{ b: string }>()
    })

    it("should require what has a default", () => {
        const options = {} as { readonly id?: string, name?: string | null, retries?: number, timeout?: number | undefined }
        expectTypeOf(defaults(options, { retries: 3, timeout: 1000 })).toEqualTypeOf<{ readonly id?: string, name?: string | null, retries: number, timeout: number }>()
        expectTypeOf(defaults(options, { id: "a", name: "b" })).toEqualTypeOf<{ readonly id: string, name: string | null, retries?: number, timeout?: number | undefined }>()
        expectTypeOf(defaults(options, {})).toEqualTypeOf<{ readonly id?: string, name?: string | null, retries?: number, timeout?: number | undefined }>()
        // @ts-expect-error not a key
        defaults(options, { retry: 3 })
        // @ts-expect-error not a value
        defaults(options, { retries: "3" })
        // @ts-expect-error not a default
        defaults(options, { retries: undefined })
    })
})
