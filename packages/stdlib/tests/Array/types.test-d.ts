import { describe, expectTypeOf, it } from "bun:test"
import { filter } from "../../src/Array/filter"
import { map } from "../../src/Array/map"
import { mapFirstWhere } from "../../src/Array/mapFirstWhere"
import { mapLastWhere } from "../../src/Array/mapLastWhere"
import { removeAll } from "../../src/Array/removeAll"
import { removeFirst } from "../../src/Array/removeFirst"
import { replaceFirst } from "../../src/Array/replaceFirst"
import { unique } from "../../src/Array/unique"

interface Task {
    id: string
    title: string
}

declare const mutable: Task[]
declare const readonly: readonly Task[]
declare const mixed: (Task | string)[]

describe("Array", () => {
    it("should return something mutable for something mutable", () => {
        expectTypeOf(removeAll(mutable, [])).toEqualTypeOf<Task[]>()
        expectTypeOf(map(mutable, (task) => task.id)).toEqualTypeOf<string[]>()
        expectTypeOf(removeFirst([1, 2, 3], 1)).toEqualTypeOf<number[]>()
    })

    it("should return something readonly for something readonly", () => {
        expectTypeOf(removeAll(readonly, [])).toEqualTypeOf<readonly Task[]>()
        expectTypeOf(map(readonly, (task) => task.id)).toEqualTypeOf<readonly string[]>()
        expectTypeOf(removeFirst([1, 2, 3] as const, 1)).toEqualTypeOf<readonly (1 | 2 | 3)[]>()
    })

    it("should only change what can be changed", () => {
        expectTypeOf(removeAll(mutable, [], { mut: true })).toEqualTypeOf<Task[]>()
        // @ts-expect-error something readonly can not be changed
        removeAll(readonly, [], { mut: true })
        // @ts-expect-error something readonly can not be changed
        mapFirstWhere(readonly, (task) => task.id === "a", (task) => task, { mut: true })
        mapLastWhere(readonly, (task) => task.id === "a", (task) => task)
    })

    it("should narrow with type guards", () => {
        expectTypeOf(filter(mixed, (value) => typeof value === "string")).toEqualTypeOf<string[]>()
        expectTypeOf(filter(mixed, (value) => value !== "a")).toEqualTypeOf<(Task | string)[]>()
        expectTypeOf(mapFirstWhere(mixed, (value) => typeof value === "string", (value) => value.toUpperCase())).toEqualTypeOf<(Task | string)[]>()
    })

    it("should reject what does not fit", () => {
        // @ts-expect-error not a task
        removeAll(readonly, ["a"])
        // @ts-expect-error not a task
        replaceFirst(readonly, readonly[0]!, "a")
        // @ts-expect-error a task has to be returned
        mapFirstWhere(readonly, (task) => task.id === "a", () => 1)
        // @ts-expect-error there is no such option
        removeFirst(mutable, mutable[0]!, { last: true })
    })

    it("should keep the arrays of a union apart", () => {
        const union = mixed as number[] | string[]
        expectTypeOf(unique(union)).toEqualTypeOf<number[] | string[]>()
        expectTypeOf(removeFirst(union as number[] | readonly string[], 1 as never)).toEqualTypeOf<number[] | readonly string[]>()
        // @ts-expect-error one of them is readonly
        unique(union as number[] | readonly string[], { mut: true })
    })

    it("should only change an array into what it holds", () => {
        const numbers = [1, 2]
        expectTypeOf(map(numbers, (value) => value + 1, { mut: true })).toEqualTypeOf<number[]>()
        expectTypeOf(map(numbers, (value) => `${value}`)).toEqualTypeOf<string[]>()
        // @ts-expect-error the array would hold strings while it says numbers
        map(numbers, (value) => `${value}`, { mut: true })
    })

    it("should not take a string for several values", () => {
        const strings = ["a", "b", "ab"]
        removeAll(strings, ["ab"])
        removeAll(strings, new Set(["ab"]))
        // @ts-expect-error a string is several characters
        removeAll(strings, "ab")
    })
})
