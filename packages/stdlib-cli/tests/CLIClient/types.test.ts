import type { CLIInvalidMessageError, CLIOptionsError, CLIUnhandledExceptionError, CLIUnknownCommandError } from "../../src"
import type { CLIClient } from "../../src/client"
import { describe, expectTypeOf, it } from "bun:test"
import { CLI } from "../../src"

type CLIErrors = CLIInvalidMessageError | CLIOptionsError | CLIUnhandledExceptionError | CLIUnknownCommandError

type TakenError = { message: string, meta: { email: string }, name: "TakenError" }

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
        if (email === "taken@miko.dev") return Err<TakenError>({ message: "Already a member", meta: { email }, name: "TakenError" })
        return Ok(email)
    })

const empty = CLI.command().desc("No action, nothing below")

const members = CLI.command().commands({ add, empty })

const serve = CLI.command().action(() => {}).commands({ status: CLI.command().action(() => Ok(1)) })

const miko = CLI.command().commands({ empty, members, serve })

describe("CLIClient", () => {
    type RPC = CLIClient<typeof miko>

    it("should only have the commands with an action, or with one below them", () => {
        expectTypeOf<keyof RPC>().toEqualTypeOf<"members" | "serve">()
        expectTypeOf<keyof RPC["members"]>().toEqualTypeOf<"add">()
        expectTypeOf<keyof RPC["serve"]>().toEqualTypeOf<"status">()
    })

    it("should only count a default that is not undefined", () => {
        const env: string | undefined = process.env["MIKO_PASSWORD"]
        const command = CLI.command().options({ kept: CLI.string().default("1").default(env), password: CLI.string().default(env) }).action(() => {})
        expectTypeOf<Parameters<CLIClient<typeof command>>[0]>().toEqualTypeOf<{ kept?: string, password: string }>()
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
        expectTypeOf<ReturnType<RPC["members"]["add"]>>().toEqualTypeOf<Promise<Result<string, TakenError | CLIErrors>>>()
        expectTypeOf<ReturnType<RPC["serve"]>>().toEqualTypeOf<Promise<Result<null, CLIErrors>>>()
        expectTypeOf<ReturnType<RPC["serve"]["status"]>>().toEqualTypeOf<Promise<Result<number, CLIErrors>>>()
    })

    it("should turn an Error or a string the action fails with into a Failure", () => {
        const command = CLI.command().commands({
            error: CLI.command().action(() => Err(new TypeError("Nope"))),
            string: CLI.command().action(async () => Err("Nope")),
        })
        expectTypeOf<ReturnType<CLIClient<typeof command>["error"]>>().toEqualTypeOf<Promise<Result<never, Failure | CLIErrors>>>()
        expectTypeOf<ReturnType<CLIClient<typeof command>["string"]>>().toEqualTypeOf<Promise<Result<never, Failure | CLIErrors>>>()
    })
})
