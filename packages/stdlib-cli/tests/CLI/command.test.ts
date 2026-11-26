import { Err, Ok } from "@monstermann/stdlib"
import { describe, expect, expectTypeOf, it } from "bun:test"
import { CLI } from "../../src"

describe("CLI.command", () => {
    it("should replace the options", () => {
        const command = CLI.command().options({ email: CLI.string() }).options({ seats: CLI.string() })
        expect(Object.keys(command.config.options)).toEqual(["seats"])
    })

    it("should have no action or options after the action", () => {
        const command = CLI.command().action(() => {})
        expect("action" in command).toBe(false)
        expect("options" in command).toBe(false)
    })

    it("should return a new command each time, leaving the one it was made from as it is", () => {
        const base = CLI.command().desc("Base")
        const changed = base.desc("Changed")
        expect(base.config.desc).toBe("Base")
        expect(changed.config.desc).toBe("Changed")
    })
})

type TakenError = { email: string, message: string, name: "TakenError" }

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
        if (email === "taken@miko.dev") return Err<TakenError>({ email, message: "Already a member", name: "TakenError" })
        return Ok(email)
    })

const empty = CLI.command().desc("No action, nothing below")

const members = CLI.command().commands({ add, empty })

describe("Command", () => {
    it("should replace the options", () => {
        const command = CLI.command().options({ email: CLI.string() }).options({ seats: CLI.string().default("1") })
        expectTypeOf<CLI.InferOptions<typeof command>>().toEqualTypeOf<{ seats: string }>()
    })

    it("should have no action without one", () => {
        expectTypeOf(members.config.action).toEqualTypeOf<undefined>()
    })

    it("should only take JSON from the action", () => {
        // @ts-expect-error a bigint is not JSON
        CLI.command().action(() => Ok(10n))
        // @ts-expect-error undefined is not JSON
        CLI.command().action(() => Ok({ email: undefined }))
    })

    it("should only have the action once, and the options before it", () => {
        expectTypeOf(add).not.toHaveProperty("action")
        expectTypeOf(add).not.toHaveProperty("options")
    })
})
