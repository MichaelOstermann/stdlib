import { describe, expect, expectTypeOf, test } from "bun:test"
import { match } from "../../src/match"

describe("shape", () => {
    describe("implementation", () => {
        test("should return matching shape", () => {
            const result = match({ foo: 2 } as { foo: 1 | 2 | 3 })
                .shape({ foo: 1 }, 1)
                .shape({ foo: 2 }, 2)
                .shape({ foo: 3 }, 3)
                .unwrap()

            expect(result).toBe(2)
        })
    })

    describe("types", () => {
        test("exhaustive patterns #1", () => {
            match({ foo: "foo" as "foo" | "bar" })
                .shape({ foo: "foo" }, true)
                .shape({ foo: "bar" }, true)
                .unwrap()
        })

        test("exhaustive patterns #2", () => {
            match({ foo: 0 as 0 | 1 })
                .shape({ foo: 0 }, true)
                .shape({ foo: 1 }, true)
                .unwrap()
        })

        test("exhaustive patterns #3", () => {
            match({ foo: true as boolean })
                .shape({ foo: true }, true)
                .shape({ foo: false }, true)
                .unwrap()
        })

        test("exhaustive patterns #4", () => {
            match({ foo: "foo" as "foo" | null })
                .shape({ foo: "foo" }, true)
                .shape({ foo: null }, true)
                .unwrap()
        })

        test("exhaustive patterns #5", () => {
            match({ foo: "foo" } as { foo?: "foo" })
                .shape({ foo: "foo" }, true)
                .shape({ foo: undefined }, true)
                .unwrap()
        })

        test("exhaustive patterns #6", () => {
            match({ foo: "foo" } as { foo: "foo" } | { bar: "bar" })
                .shape({ foo: "foo" }, true)
                .shape({ bar: "bar" }, true)
                .unwrap()
        })

        test("exhaustive patterns #7", () => {
            type ServerMessage =
                | { kind: "A" | "B" | "C", name: "A" }
                | { kind: "A" | "B" | "C", name: "B" }

            match({ kind: "C", name: "B" } as ServerMessage)
                .shape({ kind: "A", name: "A" }, true)
                .shape({ kind: "B", name: "A" }, true)
                .shape({ name: "A" }, true)
                .shape({ name: "B" }, true)
                .unwrap()
        })

        test("exhaustive patterns #8", () => {
            const isNext = true as boolean
            const isPrev = true as boolean

            match({ isNext, isPrev })
                .shape({ isNext: false, isPrev: false }, true)
                .shape({ isNext: true }, true)
                .shape({ isPrev: true }, true)
                .unwrap()
        })

        test("non-exhaustive patterns #1", () => {
            match({ foo: "foo" as "foo" | "bar" })
                .shape({ foo: "foo" }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: "foo" as "foo" | "bar" })
                .shape({ foo: "foo" }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "bar" }>()
                })
        })

        test("non-exhaustive patterns #2", () => {
            match({ foo: "foo" as string })
                .shape({ foo: "foo" }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: "foo" as string })
                .shape({ foo: "foo" }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: string }>()
                })
        })

        test("non-exhaustive patterns #3", () => {
            match({ foo: "foo" as string })
                .shape({ foo: "foo" as string }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: "foo" as string })
                .shape({ foo: "foo" as string }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: string }>()
                })
        })

        test("non-exhaustive patterns #4", () => {
            match({ foo: true as boolean })
                .shape({ foo: true }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: true as boolean })
                .shape({ foo: true }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: false }>()
                })
        })

        test("non-exhaustive patterns #5", () => {
            match({ foo: true as boolean })
                .shape({ foo: true as boolean }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: true as boolean })
                .shape({ foo: true as boolean }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: boolean }>()
                })
        })

        test("non-exhaustive patterns #6", () => {
            match({ foo: 0 as 0 | 1 })
                .shape({ foo: 0 }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: 0 as 0 | 1 })
                .shape({ foo: 0 }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: 1 }>()
                })
        })

        test("non-exhaustive patterns #7", () => {
            match({ foo: 0 as number })
                .shape({ foo: 0 }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: 0 as number })
                .shape({ foo: 0 }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: number }>()
                })
        })

        test("non-exhaustive patterns #8", () => {
            match({ foo: 0 as number })
                .shape({ foo: 0 as number }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: 0 as number })
                .shape({ foo: 0 as number }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: number }>()
                })
        })

        test("non-exhaustive patterns #9", () => {
            match({ foo: "foo" as "foo" | null })
                .shape({ foo: "foo" }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: "foo" as "foo" | null })
                .shape({ foo: "foo" }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: null }>()
                })
        })

        test("non-exhaustive patterns #10", () => {
            match({ foo: null as "foo" | null })
                .shape({ foo: null }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: null as "foo" | null })
                .shape({ foo: null }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                })
        })

        test("non-exhaustive patterns #11", () => {
            match({ foo: "foo" } as { foo?: "foo" })
                .shape({ foo: "foo" }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: "foo" } as { foo?: "foo" })
                .shape({ foo: "foo" }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: undefined }>()
                })
        })

        test("non-exhaustive patterns #12", () => {
            match({ foo: undefined } as { foo?: "foo" })
                .shape({ foo: undefined }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: undefined } as { foo?: "foo" })
                .shape({ foo: undefined }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                })
        })

        test("non-exhaustive patterns #13", () => {
            match({ foo: "foo" } as { foo: "foo" } | { bar: "bar" })
                .shape({ foo: "foo" }, true)
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: "foo" } as { foo: "foo" } | { bar: "bar" })
                .shape({ foo: "foo" }, true)
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly bar: "bar" }>()
                })
        })

        test("duplicated patterns #1", () => {
            match({ foo: "foo" as "foo" | "bar" })
                .shape({ foo: "foo" }, true)
                // @ts-expect-error test case.
                .shape({ foo: "foo" }, true)
        })

        test("duplicated patterns #2", () => {
            match({ foo: "foo" as string })
                .shape({ foo: "foo" }, true)
                // @ts-expect-error test case.
                .shape({ foo: "foo" }, true)
        })

        test("duplicated patterns #3", () => {
            match({ foo: 0 as 0 | 1 })
                .shape({ foo: 0 }, true)
                // @ts-expect-error test case.
                .shape({ foo: 0 }, true)
        })

        test("duplicated patterns #4", () => {
            match({ foo: 0 as number })
                .shape({ foo: 0 }, true)
                // @ts-expect-error test case.
                .shape({ foo: 0 }, true)
        })

        test("duplicated patterns #5", () => {
            match({ foo: true })
                .shape({ foo: true }, true)
                // @ts-expect-error test case.
                .shape({ foo: true }, true)
        })

        test("duplicated patterns #6", () => {
            match({ foo: true as boolean })
                .shape({ foo: true }, true)
                // @ts-expect-error test case.
                .shape({ foo: true }, true)
        })

        test("duplicated patterns #7", () => {
            match({ foo: null as string | null })
                .shape({ foo: null }, true)
                // @ts-expect-error test case.
                .shape({ foo: null }, true)
        })

        test("duplicated patterns #8", () => {
            match({ foo: undefined } as { foo?: string })
                .shape({ foo: undefined }, true)
                // @ts-expect-error test case.
                .shape({ foo: undefined }, true)
        })

        test("invalid patterns #1", () => {
            match({ foo: true })
                // @ts-expect-error test case.
                .shape({ bar: true }, true)
        })

        test("invalid patterns #2", () => {
            match({ foo: true })
                // @ts-expect-error test case.
                .shape({ bar: true, baz: true }, true)
        })

        test("invalid patterns #3", () => {
            match({ foo: ["foo"] })
                // @ts-expect-error test case.
                .shape({ foo: ["foo"] }, true)
        })

        test("invalid patterns #4", () => {
            match({ foo: true })
                // @ts-expect-error test case.
                .shape({ foo: undefined }, true)
        })

        test("invalid patterns #5", () => {
            match({ foo: true })
                // @ts-expect-error test case.
                .shape({}, true)
        })
    })
})
