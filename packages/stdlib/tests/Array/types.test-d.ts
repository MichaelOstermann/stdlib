import { describe, expectTypeOf, it } from "bun:test"
import { concat } from "../../src/Array/concat"
import { dropWhile } from "../../src/Array/dropWhile"
import { filter } from "../../src/Array/filter"
import { map } from "../../src/Array/map"
import { mapAt } from "../../src/Array/mapAt"
import { mapFirstWhere } from "../../src/Array/mapFirstWhere"
import { removeAll } from "../../src/Array/removeAll"
import { removeAt } from "../../src/Array/removeAt"
import { removeFirst } from "../../src/Array/removeFirst"
import { replaceFirst } from "../../src/Array/replaceFirst"
import { setAt } from "../../src/Array/setAt"
import { takeWhile } from "../../src/Array/takeWhile"
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
        expectTypeOf(setAt(mutable, -1, mutable[0]!)).toEqualTypeOf<Task[]>()
        expectTypeOf(mapAt(mutable, 0, (task) => task)).toEqualTypeOf<Task[]>()
        expectTypeOf(removeAt(mutable, 0)).toEqualTypeOf<Task[]>()
        expectTypeOf(dropWhile(mutable, () => true)).toEqualTypeOf<Task[]>()
        expectTypeOf(concat(mutable, mutable)).toEqualTypeOf<Task[]>()
    })

    it("should return something readonly for something readonly", () => {
        expectTypeOf(removeAll(readonly, [])).toEqualTypeOf<readonly Task[]>()
        expectTypeOf(map(readonly, (task) => task.id)).toEqualTypeOf<readonly string[]>()
        expectTypeOf(removeFirst([1, 2, 3] as const, 1)).toEqualTypeOf<readonly (1 | 2 | 3)[]>()
        expectTypeOf(setAt(readonly, 0, readonly[0]!)).toEqualTypeOf<readonly Task[]>()
        expectTypeOf(removeAt(readonly, 0)).toEqualTypeOf<readonly Task[]>()
        expectTypeOf(concat(readonly, mutable)).toEqualTypeOf<readonly Task[]>()
    })

    it("should narrow with type guards", () => {
        expectTypeOf(filter(mixed, (value) => typeof value === "string")).toEqualTypeOf<string[]>()
        expectTypeOf(filter(mixed, (value) => value !== "a")).toEqualTypeOf<(Task | string)[]>()
        expectTypeOf(mapFirstWhere(mixed, (value) => typeof value === "string", (value) => value.toUpperCase())).toEqualTypeOf<(Task | string)[]>()
        expectTypeOf(takeWhile(mixed, (value) => typeof value === "string")).toEqualTypeOf<string[]>()
        expectTypeOf(takeWhile(mixed, (value) => value !== "a")).toEqualTypeOf<(Task | string)[]>()
    })

    it("should reject what does not fit", () => {
        // @ts-expect-error not a task
        removeAll(readonly, ["a"])
        // @ts-expect-error a readonly array would come back as a mutable one
        concat(mutable, readonly)
        // @ts-expect-error not a task
        setAt(mutable, 0, "a")
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
    })

    it("should not take a string for several values", () => {
        const strings = ["a", "b", "ab"]
        removeAll(strings, ["ab"])
        removeAll(strings, new Set(["ab"]))
        // @ts-expect-error a string is several characters
        removeAll(strings, "ab")
    })
})
