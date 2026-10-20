import { describe, expect, it } from "bun:test"
import { match } from "../../src/match"

type Shape =
    | { kind: "circle", radius: number }
    | { kind: "point" }
    | { kind: "square", size: number }

function expectType<_ extends true>(): void {}
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false

describe("match.tag", () => {
    const shapes: Shape[] = [{ kind: "circle", radius: 1 }, { kind: "square", size: 2 }, { kind: "point" }]

    it("should call the handler of the member", () => {
        const area = (shape: Shape): number => match.tag(shape, "kind", {
            circle: (circle) => Math.PI * circle.radius ** 2,
            point: () => 0,
            square: (square) => square.size ** 2,
        })
        expect(shapes.map(area)).toEqual([Math.PI, 4, 0])
    })

    it("should narrow the value, and return what handlers return", () => {
        const result = match.tag(shapes[0]!, "kind", {
            point: () => "point" as const,
            square: (square) => square.size > 1,
            circle: (circle) => {
                expectType<Equal<typeof circle, { kind: "circle", radius: number }>>()
                return circle.radius
            },
        })
        expectType<Equal<typeof result, "point" | boolean | number>>()
        expect(result).toBe(1)
    })

    it("should fall back to _ for members without a handler", () => {
        const name = (shape: Shape): string => match.tag(shape, "kind", {
            point: () => "a point",
            _: (rest) => {
                expectType<Equal<typeof rest, Shape>>()
                return `a ${rest.kind}`
            },
        })
        expect(shapes.map(name)).toEqual(["a circle", "a square", "a point"])
    })

    it("should ask for every member, and for nothing else", () => {
        // @ts-expect-error `square` is missing
        match.tag(shapes[0]!, "kind", { circle: () => 1, point: () => 2 })
        // @ts-expect-error `triangle` is no member
        match.tag(shapes[0]!, "kind", { circle: () => 1, point: () => 2, square: () => 3, triangle: () => 4 })
        // @ts-expect-error `triangle` is no member
        match.tag(shapes[0]!, "kind", { _: () => 1, triangle: () => 4 })
        // @ts-expect-error `size` is no property of every member
        expect(() => match.tag(shapes[2]!, "size", { _: () => 1 })).not.toThrow()
    })

    it("should throw for a tag that the types did not tell about", () => {
        const handlers = { circle: () => 1, point: () => 2, square: () => 3 }
        expect(() => match.tag({ kind: "triangle" } as unknown as Shape, "kind", handlers)).toThrow(`Pattern matching error: no pattern matches value {"kind":"triangle"}`)
        expect(() => match.tag({ kind: "toString" } as unknown as Shape, "kind", handlers)).toThrow("Pattern matching error")
        expect(() => match.tag({ kind: ["circle"] } as unknown as Shape, "kind", handlers)).toThrow("Pattern matching error")
        expect(match.tag({ kind: "triangle" } as unknown as Shape, "kind", { ...handlers, _: () => 0 })).toBe(0)
    })

    it("should handle tags that are no strings by what they are written as", () => {
        type Loaded = { error: string, ok: false } | { ok: true, value: number }
        const describe = (result: Loaded): number | string => match.tag(result, "ok", {
            false: (failed) => failed.error,
            true: (loaded) => loaded.value,
        })
        expect(describe({ ok: true, value: 1 })).toBe(1)
        expect(describe({ error: "failed", ok: false })).toBe("failed")

        type Versioned = { name: string, version: 2 } | { title: string, version: 1 } | { version?: undefined }
        const title = (value: Versioned): string => match.tag(value, "version", {
            1: (old) => old.title,
            2: (current) => current.name,
            undefined: () => "none",
        })
        expect([title({ title: "a", version: 1 }), title({ name: "b", version: 2 }), title({})]).toEqual(["a", "b", "none"])
    })

    it("should handle a member with several tags by each of them", () => {
        type Event = { type: "blur" } | { key: string, type: "keydown" | "keyup" }
        const describe = (event: Event): string => match.tag(event, "type", {
            blur: () => "blur",
            keydown: (event) => `down ${event.key}`,
            keyup: (event) => `up ${event.key}`,
        })
        expect(describe({ key: "a", type: "keyup" })).toBe("up a")
    })
})
