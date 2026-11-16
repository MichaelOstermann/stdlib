import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

const add = CLI.command().desc("Add a member\nThey get an email.").options({ email: CLI.string().desc("Their email address") }).action(() => {})

const remove = CLI.command().action(() => {})

const members = CLI.command().desc("Manage who has access\nAdd and remove them.").commands({ add, remove })

describe("CLI.help.command", () => {
    it("should show the whole description and the options, the given ones last", () => {
        expect(Bun.stripANSI(CLI.help.command(add, { help: CLI.boolean().desc("Show this help") }))).toBe([
            "Description:",
            "  Add a member",
            "  They get an email.",
            "",
            "Options:",
            "  --email  Their email address",
            "  --help   Show this help",
        ].join("\n"))
    })

    it("should show the first line of the description of each subcommand", () => {
        expect(Bun.stripANSI(CLI.help.command(members))).toBe([
            "Description:",
            "  Manage who has access",
            "  Add and remove them.",
            "",
            "Commands:",
            "  add     Add a member",
            "  remove",
        ].join("\n"))
    })

    it("should leave out what the command does not have", () => {
        expect(CLI.help.command(CLI.command())).toBe("")
    })
})
