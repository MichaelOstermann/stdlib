import { describe, expect, expectTypeOf, it } from "bun:test"
import { Err, Ok, Result } from "../../src/Result"

const parse = (value: string): Result<number, "nan"> => Number.isNaN(Number(value)) ? Err("nan") : Ok(Number(value))

describe("Result", () => {
    it("should create results", () => {
        expect(Ok(1)).toMatchObject({ ok: true, value: 1 })
        expect(Err("a")).toMatchObject({ ok: false, value: "a" })
        expect(Ok().value).toBe(undefined)
        expectTypeOf(Ok(1)).toEqualTypeOf<Ok<number>>()
        expectTypeOf(Err("a")).toEqualTypeOf<Err<"a">>()
    })

    it("should narrow by ok", () => {
        const result = parse("1")
        if (result.ok) expectTypeOf(result.value).toEqualTypeOf<number>()
        else expectTypeOf(result.value).toEqualTypeOf<"nan">()
    })

    it("should catch what is thrown", () => {
        const error = new Error("a")
        const fail = (): never => {
            throw error
        }
        expect(Result.try(() => 1)).toEqual(Ok(1))
        expect(Result.try(fail).value).toBe(error)
        expect(Result.try(fail, (e) => (e as Error).message)).toEqual(Err("a"))
    })

    it("should map values and errors", () => {
        expect(parse("1").map((value) => value + 1)).toEqual(Ok(2))
        expect(parse("a").map((value) => value + 1)).toEqual(Err("nan"))
        expect(parse("1").mapErr((error) => error.length)).toEqual(Ok(1))
        expect(parse("a").mapErr((error) => error.length)).toEqual(Err(3))
    })

    it("should chain results", () => {
        expect(parse("1").andThen((value) => value > 0 ? Ok(value) : Err("negative"))).toEqual(Ok(1))
        expect(parse("-1").andThen((value) => value > 0 ? Ok(value) : Err("negative"))).toEqual(Err("negative"))
        expect(parse("a").andThen(() => Ok(0))).toEqual(Err("nan"))
        expect(parse("a").orElse(() => Ok(0))).toEqual(Ok(0))
        expect(parse("1").orElse(() => Ok(0))).toEqual(Ok(1))
    })

    it("should inspect without changing anything", () => {
        const seen: unknown[] = []
        const a = parse("1")
        const b = parse("a")
        expect(a.inspect((value) => seen.push(value)).inspectErr((error) => seen.push(error))).toBe(a)
        expect(b.inspect((value) => seen.push(value)).inspectErr((error) => seen.push(error))).toBe(b)
        expect(seen).toEqual([1, "nan"])
    })

    it("should match", () => {
        expect(parse("1").match({ Err: (error) => error, Ok: (value) => value })).toBe(1)
        expect(parse("a").match({ Err: (error) => error, Ok: (value) => value })).toBe("nan")
    })

    it("should unwrap", () => {
        expect(parse("1").unwrap()).toBe(1)
        expect(() => parse("a").unwrap()).toThrow("nan")
        expect(parse("1").unwrapOr(0)).toBe(1)
        expect(parse("a").unwrapOr(0)).toBe(0)
        expect(parse("1").unwrapOrElse((error) => error.length)).toBe(1)
        expect(parse("a").unwrapOrElse((error) => error.length)).toBe(3)
        expectTypeOf(parse("a").unwrapOrElse((error) => error)).toEqualTypeOf<number | "nan">()
    })

    describe("all", () => {
        it("should return the values when all succeeded", () => {
            const result = Result.all([Ok(1), Ok("a"), Ok(true)])
            const typed: Result<[number, string, boolean], never> = result
            expect<unknown>(typed).toEqual(Ok([1, "a", true]))
            expect(Result.all([]).unwrap()).toEqual([])
        })

        it("should return the first one that failed", () => {
            const results = [Ok(1), Err("a"), Err("b")] as [Result<number, "a">, Result<string, "a">, Result<boolean, "b">]
            const result = Result.all(results)
            const typed: Result<[number, string, boolean], "a" | "b"> = result
            expect<unknown>(typed).toBe(results[1])
        })

        it("should take a list of any length", () => {
            const results: Result<number, string>[] = [Ok(1), Ok(2)]
            const typed: Result<number[], string> = Result.all(results)
            expect<unknown>(typed).toEqual(Ok([1, 2]))
        })
    })
})
