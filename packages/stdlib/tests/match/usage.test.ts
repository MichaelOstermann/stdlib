import { describe, expect, expectTypeOf, test } from "bun:test"
import { match } from "../../src/match"

// The ways match is used where it is used, to see that they keep working.

enum Status { Open = "OPEN", Completed = "COMPLETED" }
enum Visibility { Public = "PUBLIC", Private = "PRIVATE" }

type Icon = (props: { size: number }) => string
const IconOpen: Icon = () => "open"
const IconCompleted: Icon = () => "completed"
const IconAny: Icon = () => "any"

type Block =
    | { type: "Paragraph" }
    | { type: "Code" }
    | { data: { level: 1 | 2 }, type: "Header" }

type DropTarget =
    | { direction: "ABOVE" | "BELOW", id: string, type: "TASK" }
    | { id: string, type: "SECTION" }
    | { id: string, type: "PROJECT" }

describe("usage", () => {
    test("components as results of an enum", () => {
        const icon = (status: Status | null): Icon => match(status)
            .case(Status.Open, IconOpen)
            .case(Status.Completed, IconCompleted)
            .case(null, IconAny)
            .unwrap()

        expect(icon(Status.Open)).toBe(IconOpen)
        expect(icon(null)).toBe(IconAny)
        expectTypeOf(icon).returns.toEqualTypeOf<Icon>()
    })

    test("components and callbacks as results of a field", () => {
        const icon = (block: Block) => match(block.type)
            .case("Paragraph", IconOpen)
            .case("Code", IconCompleted)
            .onCase("Header", () => {
                const data = (block as Extract<Block, { type: "Header" }>).data
                return ({ 1: IconOpen, 2: IconAny } as const)[data.level]
            })
            .unwrap()

        expect(icon({ type: "Code" })).toBe(IconCompleted)
        expect(icon({ data: { level: 2 }, type: "Header" })).toBe(IconAny)
        expectTypeOf(icon).returns.toEqualTypeOf<Icon>()
    })

    test("something that may not be there", () => {
        const members = (project?: { type: Visibility }) => match(project?.type)
            .case(undefined, [])
            .onCase(Visibility.Public, () => ["everyone"])
            .onCase(Visibility.Private, () => ["someone"])
            .unwrap()

        expect(members()).toEqual([])
        expect(members({ type: Visibility.Private })).toEqual(["someone"])
        expectTypeOf(members).returns.toEqualTypeOf<string[]>()

        const label = (type: Visibility | null) => match(type)
            .case(null, null)
            .case(Visibility.Private, "Private")
            .case(Visibility.Public, "Public")
            .unwrap()

        expect(label(Visibility.Public)).toBe("Public")
        expectTypeOf(label).returns.toEqualTypeOf<string | null>()
    })

    test("callbacks that do something", () => {
        const calls: string[] = []
        const setType = (type: "PRIVATE" | "PUBLIC") => match(type)
            .onCase("PRIVATE", () => calls.push("private"))
            .onCase("PUBLIC", () => calls.push("public"))
            .unwrap()

        setType("PUBLIC")
        expect(calls).toEqual(["public"])
    })

    test("flags", () => {
        const height = (showMenu: boolean, showColors: boolean) => match({ showColors, showMenu })
            .shape({ showColors: true }, 20)
            .shape({ showMenu: true }, 10)
            .unwrapOr(0)

        expect([height(true, true), height(true, false), height(false, false)]).toEqual([20, 10, 0])
        expectTypeOf(height).returns.toEqualTypeOf<number>()
    })

    test("one of several kinds of objects", async () => {
        const resolve = (target: DropTarget) => match(target)
            .onShape({ type: "TASK" }, (target) => `${target.id}:${target.direction}`)
            .onShape({ type: "SECTION" }, (target) => target.id)
            .onShape({ type: "PROJECT" }, async (target) => target.id)
            .unwrap()

        expect(resolve({ direction: "ABOVE", id: "a", type: "TASK" })).toBe("a:ABOVE")
        expect(await resolve({ id: "c", type: "PROJECT" })).toBe("c")
        expectTypeOf(resolve).returns.toEqualTypeOf<Promise<string> | string>()

        // Awaited as a whole.
        const awaited = async (target: DropTarget) => await match(target)
            .onShape({ type: "PROJECT" }, async (target) => target.id)
            .unwrapOr(null)

        expect(await awaited({ id: "c", type: "PROJECT" })).toBe("c")
    })

    test("one of several kinds of objects, by what a function returned", () => {
        const split = (text: string): ({ type: "emoji", value: string } | { type: "text", value: string })[] => [{ type: "text", value: text }]
        let result = ""
        for (const segment of split("a")) {
            result = match(segment)
                .onShape({ type: "text" }, () => result + segment.value)
                .onShape({ type: "emoji" }, () => `${result}:${segment.value}:`)
                .unwrap()
        }
        expect(result).toBe("a")
    })
})
