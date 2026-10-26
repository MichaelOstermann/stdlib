import { describe, expect, expectTypeOf, test } from "bun:test"
import { _ } from "../../src/_"
import { match } from "../../src/match"

type Message =
    | { type: "image", id: number, url: string }
    | { type: "ping", id: number }
    | { type: "text", id: number, value: string }

describe("match", () => {
    describe("implementation", () => {
        test("primitives", () => {
            const run = (value: number) => match(value).case(1, "one").case(2, 3, "few").unwrapOr("many")
            expect([1, 2, 3, 4].map(run)).toEqual(["one", "few", "few", "many"])
        })

        test("shapes", () => {
            const run = (value: Message) => match(value)
                .onShape({ type: "text" }, (v) => v.value)
                .onShape({ type: "image" }, (v) => v.url)
                .shape({ type: "ping" }, "ping")
                .unwrap()

            expect(run({ id: 1, type: "text", value: "hello" })).toBe("hello")
            expect(run({ id: 1, type: "image", url: "/a.png" })).toBe("/a.png")
            expect(run({ id: 1, type: "ping" })).toBe("ping")
        })

        test("tuples", () => {
            const run = (state: "busy" | "idle", event: "start" | "stop") => match([state, event])
                .shape(["idle", "start"], "busy")
                .shape(["busy", "stop"], "idle")
                .onShape([match._, match._], ([state]) => state)
                .unwrap()

            expect(run("idle", "start")).toBe("busy")
            expect(run("busy", "stop")).toBe("idle")
            expect(run("busy", "start")).toBe("busy")
        })

        test("primitives, shapes and nothing at all", () => {
            const run = (value: Message | string | null) => match(value)
                .case(null, "nothing")
                .shape({ type: "ping" }, "ping")
                .onCond((v) => typeof v === "string", (v) => v.toUpperCase())
                .unwrapOrElse((v) => v.type)

            expect(run(null)).toBe("nothing")
            expect(run("text")).toBe("TEXT")
            expect(run({ id: 1, type: "ping" })).toBe("ping")
            expect(run({ id: 1, type: "image", url: "" })).toBe("image")
        })

        test("shapes only match objects", () => {
            // Not something the types allow.
            const run = (value: unknown): boolean => (match as any)(value).shape({ type: undefined }, true).unwrapOr(false)
            expect(run(null)).toBe(false)
            expect(run("a")).toBe(false)
            expect(run({})).toBe(true)
        })

        test("tuples of another length", () => {
            // Not something the types allow.
            const run = (value: unknown): boolean => (match as any)(value).shape([1, match._], true).unwrapOr(false)
            expect(run([1])).toBe(false)
            expect(run([1, 2, 3])).toBe(false)
            expect(run([1, 2])).toBe(true)
        })

        test("functions are results, unless they are asked to be called", () => {
            const double = (value: number): number => value * 2
            expect(match(2 as number).case(2, double).unwrapOr(0)).toBe(double)
            expect(match(2 as number).cond((v) => v > 1, double).unwrapOr(0)).toBe(double)
            expect(match(3 as number).case(2, 0).unwrapOr(double)).toBe(double)
            expect(match(2 as number).onCase(2, double).unwrapOr(0)).toBe(4)
            expect(match(2 as number).onCond((v) => v > 1, double).unwrapOr(0)).toBe(4)
            expect(match(3 as number).case(2, 0).unwrapOrElse(double)).toBe(6)
        })

        test("values are compared the way === does", () => {
            expect(match(Number.NaN as number).case(Number.NaN, true).unwrapOr(false)).toBe(false)
            expect(match({ a: Number.NaN }).shape({ a: Number.NaN }, true).unwrapOr(false)).toBe(false)
            expect(match([Number.NaN, 1] as [number, number]).shape([Number.NaN, _], true).unwrapOr(false)).toBe(false)
            expect(match(Number.NaN as number).cond(Number.isNaN, true).unwrapOr(false)).toBe(true)
            expect(match(0 as number).case(-0, true).unwrapOr(false)).toBe(true)
        })

        test("cases are what the value is, shapes are what it looks like", () => {
            // Not something the types allow.
            const object = { a: 1 }
            const run = (value: unknown, method: "case" | "shape", pattern: unknown): boolean => (match as any)(value)[method](pattern, true).unwrapOr(false)
            expect(run(object, "case", object)).toBe(true)
            expect(run(object, "case", { a: 1 })).toBe(false)
            expect(run(object, "shape", { a: 1 })).toBe(true)
            expect(run(1, "shape", 1)).toBe(false)
            expect(run(_, "shape", [_])).toBe(false)
            expect(run([_], "shape", [1])).toBe(false)
        })

        test("fields that are symbols", () => {
            const key = Symbol("key")
            const run = (value: unknown): boolean => (match as any)(value).shape({ [key]: 1 }, true).unwrapOr(false)
            expect(run({ [key]: 1 })).toBe(true)
            expect(run({ [key]: 2 })).toBe(false)
        })

        test("values that can not be described", () => {
            const cycle: { self?: unknown } = {}
            cycle.self = cycle
            expect(() => (match as any)(cycle).unwrap()).toThrow("Pattern matching error: no pattern matches value [object Object]")
            expect(() => (match as any)({ a: 1n }).unwrap()).toThrow("Pattern matching error: no pattern matches value [object Object]")
            expect(() => (match as any)(Symbol("a")).unwrap()).toThrow("Pattern matching error: no pattern matches value Symbol(a)")
            const bare = Object.create(null)
            bare.self = bare
            expect(() => (match as any)(bare).unwrap()).toThrow("Pattern matching error: no pattern matches value [object Object]")
        })

        test("unwrap", () => {
            expect(() => (match as any)(3).case(1, 1).unwrap()).toThrow("Pattern matching error: no pattern matches value 3")
            expect(() => (match as any)({ a: 1 }).shape({ a: 2 }, 1).unwrap()).toThrow(`Pattern matching error: no pattern matches value {"a":1}`)
        })
    })

    describe("types", () => {
        test("return type", () => {
            const result = match(0 as 0 | 1 | 2)
                .case(0, 0)
                .onCase(1, () => "1")
                .case(2, true)
                .unwrap()

            expectTypeOf(result).toEqualTypeOf<number | string | boolean>()
        })

        test("return type of any amount of patterns", () => {
            enum Status { A, B }
            const result = match(0 as 0 | 1 | 2 | 3 | 4 | 5 | 6)
                .case(0, 1, 2, 3, 4, true)
                .case(5, Status.A)
                .case(6, { a: 1, b: "b" })
                .unwrap()

            expectTypeOf(result).toEqualTypeOf<boolean | Status.A | { a: number, b: string }>()
        })

        test("strict return type", () => {
            const result = match(0 as 0 | 1)
                .returnType<number>()
                .case(0, 0)
                // @ts-expect-error test case.
                .case(1, "1")

            expectTypeOf(result).not.toBeNever()

            match(0 as 0 | 1)
                .returnType<number>()
                // @ts-expect-error test case.
                .onCase(0, () => "0")

            expectTypeOf(match(0 as 0 | 1).returnType<number>().case(0, 0).unwrapOrElse(() => 1)).toEqualTypeOf<number>()
        })

        test("exhaustive primitives", () => {
            match("foo" as "bar" | "foo" | null | undefined)
                .case("foo", true)
                .case("bar", null, true)
                .case(undefined, true)
                .unwrap()
        })

        test("patterns that are not a single literal", () => {
            // Does not tell what is left.
            match("foo" as "bar" | "foo")
                .case("foo" as "bar" | "foo", true)
                // @ts-expect-error test case.
                .unwrap()

            match("foo" as "bar" | "baz" | "foo")
                .case("foo", "foo")
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<"bar" | "baz">()
                })
        })

        test("patterns that can not match", () => {
            match("foo" as "bar" | "foo")
                .case("foo", true)
                .case("bar", true)
                // @ts-expect-error test case.
                .case("foo", true)

            match({ id: 1, type: "ping" } as Message)
                // @ts-expect-error test case.
                .shape({ type: "text", typo: 1 }, true)

            match({ id: 1, type: "ping" } as Message)
                // @ts-expect-error test case.
                .onShape({ type: "text", typo: 1 }, () => true)
        })

        test("callbacks of several patterns", () => {
            match("foo" as "foo" | "bar" | number)
                .onCase("foo", "bar", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"bar" | "foo">()
                })
                .onCase(1, (value) => {
                    expectTypeOf(value).toEqualTypeOf<1>()
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<number>()
                })
        })

        test("exhaustive shapes", () => {
            match({ id: 1, type: "ping" } as Message)
                .onShape({ type: "text" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<Readonly<{ id: number, type: "text", value: string }>>()
                })
                .onShape({ type: "image" }, { type: "ping" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<Readonly<{ id: number, type: "image", url: string }> | Readonly<{ id: number, type: "ping" }>>()
                })
                .unwrap()
        })

        test("exhaustive shapes with several fields", () => {
            match({ a: true, b: true } as { a: boolean, b: boolean })
                .shape({ a: true, b: true }, 1)
                .shape({ a: false, b: false }, 2)
                .shape({ a: true }, 3)
                .shape({ b: true }, 4)
                .unwrap()

            match({ a: true, b: true } as { a: boolean, b: boolean })
                .shape({ a: true, b: true }, 1)
                .shape({ a: false, b: false }, 2)
                .shape({ a: true }, 3)
                // @ts-expect-error test case.
                .unwrap()

            match({ a: true, b: true } as { a: boolean, b: boolean })
                .shape({ a: true, b: true }, 1)
                .onShape({ a: true }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly a: true, readonly b: false }>()
                })
        })

        test("shapes with fields that are not literals", () => {
            // Does not tell what is left.
            match({ id: 1, type: "ping" } as Message)
                .shape({ id: 1, type: "text" }, true)
                .shape({ type: "image" }, { type: "ping" }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ id: 1, type: "ping" } as Message)
                .shape({ id: 1, type: "text" }, true)
                .shape({ type: "image" }, { type: "ping" }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<Readonly<{ id: number, type: "text", value: string }>>()
                })
        })

        test("exhaustive tuples", () => {
            match(["idle", "start"] as ["busy" | "idle", "start" | "stop"])
                .onShape(["idle", "start"], (value) => {
                    expectTypeOf(value).toEqualTypeOf<readonly ["idle", "start"]>()
                })
                .onShape(["idle", match._], (value) => {
                    expectTypeOf(value).toEqualTypeOf<readonly ["idle", "stop"]>()
                })
                .onShape(["busy", match._], (value) => {
                    expectTypeOf(value).toEqualTypeOf<readonly ["busy", "start" | "stop"]>()
                })
                .unwrap()
        })

        test("non-exhaustive tuples", () => {
            match(["idle", "start"] as ["busy" | "idle", "start" | "stop"])
                .shape(["idle", "start"], true)
                .shape(["busy", match._], true)
                // @ts-expect-error test case.
                .unwrap()

            match(["idle", "start"] as ["busy" | "idle", "start" | "stop"])
                // @ts-expect-error test case.
                .shape(["idle"], true)
        })

        test("tuples of what is being passed", () => {
            const run = (state: "busy" | "idle", event: { type: "start" } | null): number => match([state, event])
                .shape(["idle", null], 1)
                .shape(["busy", null], 2)
                .onShape([match._, match._], ([, event]) => {
                    expectTypeOf(event).toEqualTypeOf<{ type: "start" }>()
                    return 3
                })
                .unwrap()

            expect(run("idle", null)).toBe(1)
        })

        test("primitives and shapes", () => {
            match(null as Message | "none" | null)
                .case(null, "none", true)
                .shape({ type: "text" }, { type: "image" }, { type: "ping" }, true)
                .unwrap()
        })

        test("predicates that tell what the value is", () => {
            match(1 as number | string)
                .onCond((value) => typeof value === "string", (value) => {
                    expectTypeOf(value).toEqualTypeOf<string>()
                })
                .onCond((value) => value > 1, (value) => {
                    expectTypeOf(value).toEqualTypeOf<number>()
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<number>()
                })

            match(1 as number | string)
                .cond((value) => typeof value === "string", true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<number>()
                })
        })

        test("tuples that can be of another length", () => {
            match(["x"] as ["x", "y"?])
                .shape(["x"], 1)
                // @ts-expect-error test case.
                .unwrap()

            match(["x", "y"] as ["x", "y"?])
                .shape([match._, match._], 1)
                // @ts-expect-error test case.
                .unwrap()

            match(["b"] as string[] | ["b"])
                .shape([match._], 1)
                // @ts-expect-error test case.
                .unwrap()

            match([1] as [1 | 2, string?])
                .shape([1], 1)
                .shape([2], 2)
                // @ts-expect-error test case.
                .unwrap()

            match(["b"] as ["a", "b"] | ["b"])
                .shape(["b"], 1)
                .shape(["a", match._], 2)
                .unwrap()
        })

        test("records", () => {
            match({ a: "x" } as Record<string, "x" | "y">)
                .shape({ a: "x" }, 1)
                .shape({ a: "y" }, 2)
                // @ts-expect-error test case.
                .unwrap()
        })

        test("positions that could be a wildcard", () => {
            match(["a"] as ["a" | "b"])
                .onShape(["a" as "a" | typeof match._], ([value]) => {
                    expectTypeOf(value).toEqualTypeOf<"a" | "b">()
                })
                // @ts-expect-error test case.
                .unwrap()
        })

        test("wildcards", () => {
            expect(match._).toBe(_)

            const result = match(["a", "b"] as ["a" | "b", "a" | "b"])
                .shape(["a", _], 1)
                .shape(["b", match._], 2)
                .unwrap()

            expect(result).toBe(1)

            // Only as what they have been imported as, which is what is looked for when chains are compiled.
            const any = _
            match(["a", "b"] as ["a" | "b", "a" | "b"])
                // @ts-expect-error test case.
                .shape(["a", any], 1)
        })

        test("cases and shapes are not each other", () => {
            match({ id: 1, type: "ping" } as Message | "none")
                // @ts-expect-error test case.
                .case({ type: "ping" }, 1)

            match({ id: 1, type: "ping" } as Message | "none")
                // @ts-expect-error test case.
                .shape("none", 1)

            match("none" as "none" | "some")
                // @ts-expect-error test case.
                .shape({ length: 4 }, 1)

            match({ id: 1, type: "ping" } as Message | "none")
                .case("none", 1)
                .shape({ type: "ping" }, { type: "text" }, { type: "image" }, 2)
                .unwrap()
        })

        test("anything", () => {
            const result = match({ a: 1 } as any)
                .shape({ a: 1 }, "shape")
                .shape([1, match._], "tuple")
                .case(1, "primitive")
                .unwrapOr(null)

            expectTypeOf(result).toEqualTypeOf<string | null>()
        })

        test("predicates that tell more than the input does", () => {
            match([1] as string | number[])
                .onCond(Array.isArray, (value) => {
                    expectTypeOf(value).toEqualTypeOf<readonly number[]>()
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<string>()
                })
        })

        test("results that have been given a type", () => {
            const state = "on" as "off" | "on"
            const maybe = "a" as "a" | undefined
            const flag = true as boolean
            expectTypeOf(match(1 as number).case(1, state).unwrapOr(null)).toEqualTypeOf<"off" | "on" | null>()
            expectTypeOf(match(1 as number).case(1, maybe).unwrapOr(null)).toEqualTypeOf<"a" | null | undefined>()
            expectTypeOf(match(1 as number).case(1, flag).unwrapOr(null)).toEqualTypeOf<boolean | null>()
            expectTypeOf(match(1 as number).case(1, "on").unwrapOr(null)).toEqualTypeOf<string | null>()
        })

        test("functions as results", () => {
            const add = (a: number, b: number): number => a + b
            const result = match(1 as number).case(1, add).cond((value) => value > 1, add).unwrapOr(add)
            expectTypeOf(result).toEqualTypeOf<(a: number, b: number) => number>()

            match(1 as number)
                // @ts-expect-error test case.
                .onCase(1, add)
        })
    })
})
