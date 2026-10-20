import { describe, expect, expectTypeOf, test } from "bun:test"
import { match } from "../../src/match"

describe("onCase", () => {
    describe("implementation", () => {
        test("should return matching primitive", () => {
            const result = match(2 as 1 | 2 | 3)
                .onCase(1, () => "one")
                .onCase(2, () => "two")
                .onCase(3, () => "three")
                .unwrap()

            expect(result).toBe("two")
        })

        test("should forward matched value", () => {
            const result = match(0)
                .onCase(0, (num) => {
                    expect(num).toBe(0)
                    return true
                })
                .unwrap()

            expect(result).toBe(true)
        })
    })

    describe("types", () => {
        test("inferred return type", () => {
            const result = match(0 as 0 | 1 | 2)
                .onCase(0, () => 0)
                .onCase(1, () => "1")
                .onCase(2, () => true)
                .unwrap()

            expectTypeOf(result).toEqualTypeOf<number | string | boolean>()
        })

        test("strict return type", () => {
            match(0 as 0 | 1)
                .returnType<number>()
                .onCase(0, () => 0)
                // @ts-expect-error test case.
                .onCase(1, () => "1")
        })

        test("exhaustive patterns #1", () => {
            match("foo" as "foo" | "bar")
                .onCase("foo", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                    return "foo"
                })
                .onCase("bar", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"bar">()
                    return "bar"
                })
                .unwrap()
        })

        test("exhaustive patterns #2", () => {
            match(0 as 0 | 1)
                .onCase(0, (value) => {
                    expectTypeOf(value).toEqualTypeOf<0>()
                    return 0
                })
                .onCase(1, (value) => {
                    expectTypeOf(value).toEqualTypeOf<1>()
                    return 1
                })
                .unwrap()
        })

        test("exhaustive patterns #3", () => {
            match(true as boolean)
                .onCase(true, (value) => {
                    expectTypeOf(value).toEqualTypeOf<true>()
                    return true
                })
                .onCase(false, (value) => {
                    expectTypeOf(value).toEqualTypeOf<false>()
                    return false
                })
                .unwrap()
        })

        test("exhaustive patterns #4", () => {
            match("foo" as "foo" | null)
                .onCase("foo", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                    return "foo"
                })
                .onCase(null, (value) => {
                    expectTypeOf(value).toEqualTypeOf<null>()
                    return null
                })
                .unwrap()
        })

        test("exhaustive patterns #5", () => {
            match("foo" as "foo" | undefined)
                .onCase("foo", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                    return "foo"
                })
                .onCase(undefined, (value) => {
                    expectTypeOf(value).toEqualTypeOf<undefined>()
                    return undefined
                })
                .unwrap()
        })

        test("non-exhaustive patterns #1", () => {
            match("foo" as "foo" | "bar")
                .onCase("foo", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                    return "foo"
                })
                // @ts-expect-error test case.
                .unwrap()

            match("foo" as "foo" | "bar")
                .onCase("foo", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                    return "foo"
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<"bar">()
                })
        })

        test("non-exhaustive patterns #2", () => {
            match("foo" as string)
                .onCase("foo", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                    return "foo"
                })
                // @ts-expect-error test case.
                .unwrap()

            match("foo" as string)
                .onCase("foo", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                    return "foo"
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<string>()
                })
        })

        test("non-exhaustive patterns #3", () => {
            match("foo" as string)
                .onCase("foo" as string, (value) => {
                    expectTypeOf(value).toEqualTypeOf<string>()
                    return "foo"
                })
                // @ts-expect-error test case.
                .unwrap()

            match("foo" as string)
                .onCase("foo" as string, (value) => {
                    expectTypeOf(value).toEqualTypeOf<string>()
                    return "foo"
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<string>()
                })
        })

        test("non-exhaustive patterns #4", () => {
            match(true as boolean)
                .onCase(true, (value) => {
                    expectTypeOf(value).toEqualTypeOf<true>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match(true as boolean)
                .onCase(true, (value) => {
                    expectTypeOf(value).toEqualTypeOf<true>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<false>()
                })
        })

        test("non-exhaustive patterns #5", () => {
            match(true as boolean)
                .onCase(true as boolean, (value) => {
                    expectTypeOf(value).toEqualTypeOf<boolean>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match(true as boolean)
                .onCase(true as boolean, (value) => {
                    expectTypeOf(value).toEqualTypeOf<boolean>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<boolean>()
                })
        })

        test("non-exhaustive patterns #6", () => {
            match(0 as 0 | 1)
                .onCase(0, (value) => {
                    expectTypeOf(value).toEqualTypeOf<0>()
                    return 0
                })
                // @ts-expect-error test case.
                .unwrap()

            match(0 as 0 | 1)
                .onCase(0, (value) => {
                    expectTypeOf(value).toEqualTypeOf<0>()
                    return 0
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<1>()
                })
        })

        test("non-exhaustive patterns #7", () => {
            match(0 as number)
                .onCase(0, (value) => {
                    expectTypeOf(value).toEqualTypeOf<0>()
                    return 0
                })
                // @ts-expect-error test case.
                .unwrap()

            match(0 as number)
                .onCase(0, (value) => {
                    expectTypeOf(value).toEqualTypeOf<0>()
                    return 0
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<number>()
                })
        })

        test("non-exhaustive patterns #8", () => {
            match(0 as number)
                .onCase(0 as number, (value) => {
                    expectTypeOf(value).toEqualTypeOf<number>()
                    return 0
                })
                // @ts-expect-error test case.
                .unwrap()

            match(0 as number)
                .onCase(0 as number, (value) => {
                    expectTypeOf(value).toEqualTypeOf<number>()
                    return 0
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<number>()
                })
        })

        test("non-exhaustive patterns #9", () => {
            match("foo" as "foo" | null)
                .onCase("foo", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                    return "foo"
                })
                // @ts-expect-error test case.
                .unwrap()

            match("foo" as "foo" | null)
                .onCase("foo", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                    return "foo"
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<null>()
                })
        })

        test("non-exhaustive patterns #10", () => {
            match("foo" as "foo" | undefined)
                .onCase("foo", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                    return "foo"
                })
                // @ts-expect-error test case.
                .unwrap()

            match("foo" as "foo" | undefined)
                .onCase("foo", (value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                    return "foo"
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<undefined>()
                })
        })

        test("non-exhaustive patterns #11", () => {
            match(null as "foo" | null)
                .onCase(null, (value) => {
                    expectTypeOf(value).toEqualTypeOf<null>()
                    return null
                })
                // @ts-expect-error test case.
                .unwrap()

            match(null as "foo" | null)
                .onCase(null, (value) => {
                    expectTypeOf(value).toEqualTypeOf<null>()
                    return null
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                })
        })

        test("non-exhaustive patterns #12", () => {
            match(undefined as "foo" | undefined)
                .onCase(undefined, (value) => {
                    expectTypeOf(value).toEqualTypeOf<undefined>()
                    return undefined
                })
                // @ts-expect-error test case.
                .unwrap()

            match(undefined as "foo" | undefined)
                .onCase(undefined, (value) => {
                    expectTypeOf(value).toEqualTypeOf<undefined>()
                    return undefined
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<"foo">()
                })
        })

        test("duplicated patterns #1", () => {
            match("foo" as "foo" | "bar")
                .onCase("foo", () => "foo")
                // @ts-expect-error test case.
                .onCase("foo", () => "foo")
        })

        test("duplicated patterns #2", () => {
            match("foo" as string)
                .onCase("foo", () => "foo")
                // @ts-expect-error test case.
                .onCase("foo", () => "foo")
        })

        test("duplicated patterns #3", () => {
            match(0 as 0 | 1)
                .onCase(0, () => 0)
                // @ts-expect-error test case.
                .onCase(0, () => 0)
        })

        test("duplicated patterns #4", () => {
            match(0 as number)
                .onCase(0, () => 0)
                // @ts-expect-error test case.
                .onCase(0, () => 0)
        })

        test("duplicated patterns #5", () => {
            match(true)
                .onCase(true, () => true)
                // @ts-expect-error test case.
                .onCase(true, () => true)
        })

        test("duplicated patterns #6", () => {
            match(true as boolean)
                .onCase(true, () => true)
                // @ts-expect-error test case.
                .onCase(true, () => true)
        })

        test("duplicated patterns #7", () => {
            match(null as string | null)
                .onCase(null, () => null)
                // @ts-expect-error test case.
                .onCase(null, () => null)
        })

        test("duplicated patterns #8", () => {
            match(undefined as string | undefined)
                .onCase(undefined, () => undefined)
                // @ts-expect-error test case.
                .onCase(undefined, () => undefined)
        })

        test("invalid patterns #1", () => {
            match("foo")
                // @ts-expect-error test case.
                .onCase("foo" as string, () => true)
        })

        test("invalid patterns #2", () => {
            match(0)
                // @ts-expect-error test case.
                .onCase(0 as number, () => true)
        })

        test("invalid patterns #3", () => {
            match(true)
                // @ts-expect-error test case.
                .onCase(false as boolean, () => true)
        })

        test("autocompletion #1", () => {
            const result = match("foo" as "foo" | "bar").onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<"foo" | "bar">()
        })

        test("autocompletion #2", () => {
            const result = match("foo" as "foo" | "bar").onCase("foo", () => true).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<"bar">()
        })

        test("autocompletion #3", () => {
            const result = match("foo" as string).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<string>()
        })

        test("autocompletion #4", () => {
            const result = match("foo" as string).onCase("foo", () => true).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<string>()
        })

        test("autocompletion #5", () => {
            const result = match(true as boolean).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<boolean>()
        })

        test("autocompletion #6", () => {
            const result = match(true as boolean).onCase(true, () => true).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<false>()
        })

        test("autocompletion #7", () => {
            const result = match(true as boolean).onCase(false, () => true).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<true>()
        })

        test("autocompletion #8", () => {
            const result = match(0 as 0 | 1).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<0 | 1>()
        })

        test("autocompletion #9", () => {
            const result = match(0 as 0 | 1).onCase(0, () => true).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<1>()
        })

        test("autocompletion #10", () => {
            const result = match(0 as number).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<number>()
        })

        test("autocompletion #11", () => {
            const result = match(0 as number).onCase(0, () => true).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<number>()
        })

        test("autocompletion #12", () => {
            const result = match("foo" as "foo" | null).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<"foo" | null>()
        })

        test("autocompletion #13", () => {
            const result = match("foo" as "foo" | null).onCase("foo", () => true).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<null>()
        })

        test("autocompletion #14", () => {
            const result = match("foo" as "foo" | null).onCase(null, () => true).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<"foo">()
        })

        test("autocompletion #15", () => {
            const result = match("foo" as "foo" | undefined).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<"foo" | undefined>()
        })

        test("autocompletion #16", () => {
            const result = match("foo" as "foo" | undefined).onCase("foo", () => true).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<undefined>()
        })

        test("autocompletion #17", () => {
            const result = match("foo" as "foo" | undefined).onCase(undefined, () => true).onCase
            expectTypeOf<Parameters<typeof result>[0]>().toEqualTypeOf<"foo">()
        })
    })
})
