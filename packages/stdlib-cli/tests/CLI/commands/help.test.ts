import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

const add = CLI.command().desc("Add a member\nThey get an email.").options({ email: CLI.string().desc("Their email address") }).action(() => {})
const members = CLI.command().desc("Manage who has access\nAdd and remove them.").commands({ add })
const globalOptions = { help: CLI.boolean().desc("Show this help") }

describe("CLI.commands.help", () => {
    it("should show the path, the whole description and the options, global ones last", () => {
        const help = CLI.commands.help({ command: add, globalOptions, path: ["miko", "members", "add"] })
        expect(Bun.stripANSI(help)).toBe([
            "Command:",
            "  miko members add",
            "",
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
        const help = CLI.commands.help({ command: members, path: ["miko", "members"] })
        expect(Bun.stripANSI(help)).toBe([
            "Command:",
            "  miko members",
            "",
            "Description:",
            "  Manage who has access",
            "  Add and remove them.",
            "",
            "Commands:",
            "  add  Add a member",
        ].join("\n"))
    })

    it("should leave out what the command does not have", () => {
        const help = CLI.commands.help({ command: CLI.command(), path: ["miko"] })
        expect(Bun.stripANSI(help)).toBe("Command:\n  miko")
    })
})
