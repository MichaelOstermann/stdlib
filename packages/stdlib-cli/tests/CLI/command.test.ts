import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

describe("CLI.command", () => {
    it("should return Ok when the action returns nothing", async () => {
        const command = CLI.command().action(() => {})
        expect(await command.config.action({})).toEqual(Ok(undefined))
    })

    it("should return what the action returns, also when it is async", async () => {
        const command = CLI.command().action(async () => Err("Nope"))
        expect(await command.config.action({})).toEqual(Err("Nope"))
    })

    it("should forget the action when the options change", () => {
        const command = CLI.command().action(() => {}).options({ email: CLI.string() })
        expect(command.config.action).toBeUndefined()
    })

    it("should add options after the ones that are there, and replace those of the same name in place", () => {
        const command = CLI
            .command()
            .option("email", CLI.string())
            .options({ notify: CLI.boolean(), seats: CLI.string() })
            .option("email", CLI.string().optional(true))
        expect(Object.keys(command.config.options)).toEqual(["email", "notify", "seats"])
        expect(command.config.options.email.config.optional).toBe(true)
    })

    it("should forget the action when an option is added", () => {
        const command = CLI.command().action(() => {}).option("email", CLI.string())
        expect(command.config.action).toBeUndefined()
    })

    it("should return a new command each time, leaving the one it was made from as it is", () => {
        const base = CLI.command().desc("Base")
        const changed = base.desc("Changed")
        expect(base.config.desc).toBe("Base")
        expect(changed.config.desc).toBe("Changed")
    })
})

describe("CLI.string", () => {
    it("should return a new option each time", () => {
        const base = CLI.string()
        const optional = base.optional(true)
        expect(base.config.optional).toBe(false)
        expect(optional.config.optional).toBe(true)
    })
})

describe("CLI.boolean", () => {
    it("should be off by default", () => {
        expect(CLI.boolean().config.default).toBe(false)
        expect(CLI.boolean().default(true).config.default).toBe(true)
    })
})

describe("CLI.enum", () => {
    it("should forget the default when the options change", () => {
        const role = CLI.enum().options({ admin: "", member: "" }).default("member")
        expect(role.config.default).toBe("member")
        expect(role.options({ guest: "" }).config.default).toBeUndefined()
    })
})
