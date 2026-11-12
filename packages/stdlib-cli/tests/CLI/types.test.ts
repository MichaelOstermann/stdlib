import type { CLIOptionsError, CLIUnhandledExceptionError, CLIUnknownCommandError, InferOptions, InferRPC } from "../../src"
import { describe, expectTypeOf, it } from "bun:test"
import { CLI } from "../../src"

type CLIErrors = CLIOptionsError | CLIUnhandledExceptionError | CLIUnknownCommandError

const add = CLI
    .command()
    .options({
        email: CLI.string(),
        firstName: CLI.string().optional(true),
        notify: CLI.boolean(),
        role: CLI.enum().options({ admin: "", member: "" }).default("member"),
        seats: CLI.string().default("1").parse((value) => Ok(Number(value))),
        team: CLI.enum().options({ a: "", b: "" }),
    })
    .action(({ email }) => {
        if (email === "taken@miko.dev") return Err("Taken" as const)
        return Ok(email)
    })
const empty = CLI.command().desc("No action, nothing below")
const members = CLI.command().commands({ add, empty })
const serve = CLI.command().action(() => {}).commands({ status: CLI.command().action(() => Ok(1)) })
const miko = CLI.command().commands({ empty, members, serve })

describe("InferOptions", () => {
    it("should be the values the action gets", () => {
        expectTypeOf<InferOptions<typeof add>>().toEqualTypeOf<{
            email: string
            firstName: string | undefined
            notify: boolean
            role: "admin" | "member"
            seats: number
            team: "a" | "b"
        }>()
    })
})

describe("Command", () => {
    it("should merge the options of .option() and .options(), the last of the same name wins", () => {
        const command = CLI
            .command()
            .option("email", CLI.string())
            .options({ seats: CLI.string().default("1") })
            .option("email", CLI.string().optional(true))
        expectTypeOf<InferOptions<typeof command>>().toEqualTypeOf<{ email: string | undefined, seats: string }>()
    })

    it("should know what the action returns", () => {
        expectTypeOf(add.config.action).returns.toEqualTypeOf<Promise<Result<string, "Taken">>>()
        expectTypeOf(serve.config.action).returns.toEqualTypeOf<Promise<Result<void, never>>>()
        expectTypeOf(members.config.action).toEqualTypeOf<undefined>()
    })
})

describe("InferRPC", () => {
    type RPC = InferRPC<typeof miko>

    it("should only have the commands with an action, or with one below them", () => {
        expectTypeOf<keyof RPC>().toEqualTypeOf<"members" | "serve">()
        expectTypeOf<keyof RPC["members"]>().toEqualTypeOf<"add">()
        expectTypeOf<keyof RPC["serve"]>().toEqualTypeOf<"status">()
    })

    it("should take the options as they are typed, optional when they fall back to something", () => {
        expectTypeOf<Parameters<RPC["members"]["add"]>[0]>().toEqualTypeOf<{
            email: string
            firstName?: string
            notify?: boolean
            role?: "admin" | "member"
            seats?: string
            team: "a" | "b"
        }>()
    })

    it("should return what the action returns, and what can go wrong on the way", () => {
        expectTypeOf<ReturnType<RPC["members"]["add"]>>().toEqualTypeOf<Promise<Result<string, "Taken" | CLIErrors>>>()
        expectTypeOf<ReturnType<RPC["serve"]>>().toEqualTypeOf<Promise<Result<void, CLIErrors>>>()
        expectTypeOf<ReturnType<RPC["serve"]["status"]>>().toEqualTypeOf<Promise<Result<number, CLIErrors>>>()
    })
})
