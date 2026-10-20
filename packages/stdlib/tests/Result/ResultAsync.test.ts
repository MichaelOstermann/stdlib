import { describe, expect, expectTypeOf, it } from "bun:test"
import { Err, Ok } from "../../src/Result"
import { ErrAsync, OkAsync, ResultAsync } from "../../src/ResultAsync"

const parse = (value: string): ResultAsync<number, "nan"> => ResultAsync.from(() => Number.isNaN(Number(value)) ? Err("nan" as const) : Ok(Number(value)))

describe("ResultAsync", () => {
    it("should create results", async () => {
        expect(await OkAsync(1)).toEqual(Ok(1))
        expect(await ErrAsync("a")).toEqual(Err("a"))
        expect(await ResultAsync.from(async () => Ok(1))).toEqual(Ok(1))
    })

    it("should catch what is thrown or rejected", async () => {
        const error = new Error("a")
        const fail = (): never => {
            throw error
        }
        expect(await ResultAsync.try(async () => 1)).toEqual(Ok(1))
        expect((await ResultAsync.try(fail)).value).toBe(error)
        expect(await ResultAsync.try(async () => fail(), (e) => (e as Error).message)).toEqual(Err("a"))
        expect(await ResultAsync.promise(Promise.resolve(1))).toEqual(Ok(1))
        expect(await ResultAsync.promise(Promise.reject(error), (e) => (e as Error).message)).toEqual(Err("a"))
    })

    it("should map values and errors", async () => {
        expect(await parse("1").map(async (value) => value + 1)).toEqual(Ok(2))
        expect(await parse("a").map((value) => value + 1)).toEqual(Err("nan"))
        expect(await parse("1").mapErr((error) => error.length)).toEqual(Ok(1))
        expect(await parse("a").mapErr(async (error) => error.length)).toEqual(Err(3))
    })

    it("should chain results", async () => {
        expect(await parse("1").andThen((value) => Ok(value + 1))).toEqual(Ok(2))
        expect(await parse("1").andThen((value) => parse(`${value}a`))).toEqual(Err("nan"))
        expect(await parse("a").andThen(() => Ok(0))).toEqual(Err("nan"))
        expect(await parse("a").orElse(() => Ok(0))).toEqual(Ok(0))
        expect(await parse("1").orElse(async () => Ok(0))).toEqual(Ok(1))
    })

    it("should inspect without changing anything", async () => {
        const seen: unknown[] = []
        expect(await parse("1").inspect((value) => void seen.push(value)).inspectErr((error) => void seen.push(error))).toEqual(Ok(1))
        expect(await parse("a").inspect((value) => void seen.push(value)).inspectErr(async (error) => void seen.push(error))).toEqual(Err("nan"))
        expect(seen).toEqual([1, "nan"])
    })

    it("should match", async () => {
        expect(await parse("1").match({ Err: (error) => error, Ok: async (value) => value })).toBe(1)
        expect(await parse("a").match({ Err: (error) => error, Ok: (value) => value })).toBe("nan")
    })

    it("should unwrap", async () => {
        expect(await parse("1").unwrap()).toBe(1)
        expect(parse("a").unwrap()).rejects.toBe("nan")
        expect(await parse("1").unwrapOr(0)).toBe(1)
        expect(await parse("a").unwrapOr(0)).toBe(0)
        expect(await parse("1").unwrapOrElse((error) => error.length)).toBe(1)
        expect(await parse("a").unwrapOrElse(async (error) => error.length)).toBe(3)
        expectTypeOf(parse("a").unwrapOrElse(async (error) => error)).toEqualTypeOf<Promise<number | "nan">>()
    })

    describe("all", () => {
        it("should return the values when all succeeded", async () => {
            const result = await ResultAsync.all([OkAsync(1), Ok("a"), Promise.resolve(Ok(true))])
            const typed: Result<[number, string, boolean], never> = result
            expect<unknown>(typed).toEqual(Ok([1, "a", true]))
            expect(await ResultAsync.all([]).unwrap()).toEqual([])
        })

        it("should return the first one that failed, by where it is", async () => {
            const slow = new ResultAsync<number, "slow">(new Promise((resolve) => setTimeout(resolve, 10, Err("slow"))))
            const result = await ResultAsync.all([OkAsync(1), slow, ErrAsync("fast" as const)])
            const typed: Result<[number, number, never], "fast" | "slow"> = result
            expect<unknown>(typed).toEqual(Err("slow"))
        })

        it("should take a list of any length", async () => {
            const results: ResultAsync<number, string>[] = [OkAsync(1), OkAsync(2)]
            const typed: Result<number[], string> = await ResultAsync.all(results)
            expect<unknown>(typed).toEqual(Ok([1, 2]))
        })
    })
})
