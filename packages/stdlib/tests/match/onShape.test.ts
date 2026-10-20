import { describe, expect, expectTypeOf, test } from "bun:test"
import { match } from "../../src/match"

describe("onShape", () => {
    describe("implementation", () => {
        test("should return matching shape", () => {
            const result = match({ foo: 2 } as { foo: 1 | 2 | 3 })
                .onShape({ foo: 1 }, () => 1)
                .onShape({ foo: 2 }, () => 2)
                .onShape({ foo: 3 }, () => 3)
                .unwrap()

            expect(result).toBe(2)
        })
    })

    describe("types", () => {
        test("exhaustive patterns #1", () => {
            match({ foo: "foo" as "foo" | "bar" })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                .onShape({ foo: "bar" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "bar" }>()
                    return true
                })
                .unwrap()
        })

        test("exhaustive patterns #2", () => {
            match({ foo: 0 as 0 | 1 })
                .onShape({ foo: 0 }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: 0 }>()
                    return true
                })
                .onShape({ foo: 1 }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: 1 }>()
                    return true
                })
                .unwrap()
        })

        test("exhaustive patterns #3", () => {
            match({ foo: true as boolean })
                .onShape({ foo: true }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: true }>()
                    return true
                })
                .onShape({ foo: false }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: false }>()
                    return true
                })
                .unwrap()
        })

        test("exhaustive patterns #4", () => {
            match({ foo: "foo" as "foo" | null })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                .onShape({ foo: null }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: null }>()
                    return true
                })
                .unwrap()
        })

        test("exhaustive patterns #5", () => {
            match({ foo: "foo" } as { foo?: "foo" })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                .onShape({ foo: undefined }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: undefined }>()
                    return true
                })
                .unwrap()
        })

        test("exhaustive patterns #6", () => {
            match({ foo: "foo" } as { foo: "foo" } | { bar: "bar" })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                .onShape({ bar: "bar" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly bar: "bar" }>()
                    return true
                })
                .unwrap()
        })

        test("exhaustive patterns #7", () => {
            enum Status { A = 0, B = 1, C = 2 }
            match({ type: Status.A } as { type: Status })
                .onShape({ type: Status.A }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly type: Status.A }>()
                    return true
                })
                .onShape({ type: Status.B }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly type: Status.B }>()
                    return true
                })
                .onShape({ type: Status.C }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly type: Status.C }>()
                    return true
                })
                .unwrap()
        })

        test("non-exhaustive patterns #1", () => {
            match({ foo: "foo" as "foo" | "bar" })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: "foo" as "foo" | "bar" })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "bar" }>()
                })
        })

        test("non-exhaustive patterns #2", () => {
            match({ foo: "foo" as string })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: "foo" as string })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: string }>()
                })
        })

        test("non-exhaustive patterns #3", () => {
            match({ foo: "foo" as string })
                .onShape({ foo: "foo" as string }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: string }>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: "foo" as string })
                .onShape({ foo: "foo" as string }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: string }>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: string }>()
                })
        })

        test("non-exhaustive patterns #4", () => {
            match({ foo: true as boolean })
                .onShape({ foo: true }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: true }>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: true as boolean })
                .onShape({ foo: true }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: true }>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: false }>()
                })
        })

        test("non-exhaustive patterns #6", () => {
            match({ foo: 0 as 0 | 1 })
                .onShape({ foo: 0 }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: 0 }>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: 0 as 0 | 1 })
                .onShape({ foo: 0 }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: 0 }>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: 1 }>()
                })
        })

        test("non-exhaustive patterns #7", () => {
            match({ foo: 0 as number })
                .onShape({ foo: 0 }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: 0 }>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: 0 as number })
                .onShape({ foo: 0 }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: 0 }>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: number }>()
                })
        })

        test("non-exhaustive patterns #8", () => {
            match({ foo: 0 as number })
                .onShape({ foo: 0 as number }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: number }>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: 0 as number })
                .onShape({ foo: 0 as number }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: number }>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: number }>()
                })
        })

        test("non-exhaustive patterns #9", () => {
            match({ foo: "foo" as "foo" | null })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: "foo" as "foo" | null })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: null }>()
                })
        })

        test("non-exhaustive patterns #10", () => {
            match({ foo: null as "foo" | null })
                .onShape({ foo: null }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: null }>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: null as "foo" | null })
                .onShape({ foo: null }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: null }>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                })
        })

        test("non-exhaustive patterns #11", () => {
            match({ foo: "foo" } as { foo?: "foo" })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: "foo" } as { foo?: "foo" })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: undefined }>()
                })
        })

        test("non-exhaustive patterns #12", () => {
            match({ foo: undefined } as { foo?: "foo" })
                .onShape({ foo: undefined }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: undefined }>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: undefined } as { foo?: "foo" })
                .onShape({ foo: undefined }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: undefined }>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                })
        })

        test("non-exhaustive patterns #13", () => {
            match({ foo: "foo" } as { foo: "foo" } | { bar: "bar" })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                // @ts-expect-error test case.
                .unwrap()

            match({ foo: "foo" } as { foo: "foo" } | { bar: "bar" })
                .onShape({ foo: "foo" }, (value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly foo: "foo" }>()
                    return true
                })
                .unwrapOrElse((value) => {
                    expectTypeOf(value).toEqualTypeOf<{ readonly bar: "bar" }>()
                })
        })

        test("duplicated patterns #1", () => {
            match({ foo: "foo" as "foo" | "bar" })
                .onShape({ foo: "foo" }, () => true)
                // @ts-expect-error test case.
                .onShape({ foo: "foo" }, () => true)
        })

        test("duplicated patterns #2", () => {
            match({ foo: "foo" as string })
                .onShape({ foo: "foo" }, () => true)
                // @ts-expect-error test case.
                .onShape({ foo: "foo" }, () => true)
        })

        test("duplicated patterns #3", () => {
            match({ foo: 0 as 0 | 1 })
                .onShape({ foo: 0 }, () => true)
                // @ts-expect-error test case.
                .onShape({ foo: 0 }, () => true)
        })

        test("duplicated patterns #4", () => {
            match({ foo: 0 as number })
                .onShape({ foo: 0 }, () => true)
                // @ts-expect-error test case.
                .onShape({ foo: 0 }, () => true)
        })

        test("duplicated patterns #5", () => {
            match({ foo: true })
                .onShape({ foo: true }, () => true)
                // @ts-expect-error test case.
                .onShape({ foo: true }, () => true)
        })

        test("duplicated patterns #6", () => {
            match({ foo: true as boolean })
                .onShape({ foo: true }, () => true)
                // @ts-expect-error test case.
                .onShape({ foo: true }, () => true)
        })

        test("duplicated patterns #7", () => {
            match({ foo: null as string | null })
                .onShape({ foo: null }, () => true)
                // @ts-expect-error test case.
                .onShape({ foo: null }, () => true)
        })

        test("duplicated patterns #8", () => {
            match({ foo: undefined } as { foo?: string })
                .onShape({ foo: undefined }, () => true)
                // @ts-expect-error test case.
                .onShape({ foo: undefined }, () => true)
        })

        test("invalid patterns #1", () => {
            match({ foo: true })
                // @ts-expect-error test case.
                .onShape({ bar: true }, () => true)
        })

        test("invalid patterns #2", () => {
            match({ foo: true })
                // @ts-expect-error test case.
                .onShape({ bar: true, baz: true }, () => true)
        })

        test("invalid patterns #3", () => {
            match({ foo: ["foo"] })
                // @ts-expect-error test case.
                .onShape({ foo: ["foo"] }, () => true)
        })

        test("invalid patterns #4", () => {
            match({ foo: true })
                // @ts-expect-error test case.
                .onShape({ foo: undefined }, () => true)
        })

        test("invalid patterns #5", () => {
            match({ foo: true })
                // @ts-expect-error test case.
                .onShape({}, () => true)
        })
    })
})
