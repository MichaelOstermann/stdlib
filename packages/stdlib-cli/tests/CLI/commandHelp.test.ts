import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

const add = CLI.command().desc("Add a member\nThey get an email.").options({ email: CLI.string().desc("Their email address") }).action(() => {})

const remove = CLI.command().action(() => {})

const members = CLI.command().desc("Manage who has access\nAdd and remove them.").commands({ add, remove })

describe("CLI.commandHelp", () => {
    it("should show the whole description and the options, the given ones last", () => {
        expect(Bun.stripANSI(CLI.commandHelp(add, { globalOptions: { help: CLI.boolean().desc("Show this help") } }))).toBe([
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
        expect(Bun.stripANSI(CLI.commandHelp(members))).toBe([
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
        expect(CLI.commandHelp(CLI.command())).toBe("")
    })

    it("should show an example with every required option, when each of them has one", () => {
        const invite = CLI.command().options({
            email: CLI.string().example("jane@miko.dev"),
            name: CLI.string().example("Jane Doe"),
            note: CLI.string().optional(true).example("Hi"),
            notify: CLI.boolean(),
            role: CLI.enum().options({ admin: "", viewer: "" }),
        }).action(() => {})
        expect(Bun.stripANSI(CLI.commandHelp(invite, { path: ["miko", "invite"] }))).toStartWith("Example:\n  miko invite --email jane@miko.dev --name 'Jane Doe' --role admin\n")
    })

    it("should show no example when a required option has none, is sensitive, or there is no path", () => {
        const withoutExample = CLI.command().options({ email: CLI.string() }).action(() => {})
        const sensitive = CLI.command().options({ password: CLI.string().sensitive(true).example("hunter2") }).action(() => {})
        const optional = CLI.command().options({ note: CLI.string().optional(true).example("Hi") }).action(() => {})
        expect(Bun.stripANSI(CLI.commandHelp(withoutExample, { path: ["miko"] }))).not.toContain("Example:")
        expect(Bun.stripANSI(CLI.commandHelp(sensitive, { path: ["miko"] }))).not.toContain("Example:")
        expect(Bun.stripANSI(CLI.commandHelp(optional, { path: ["miko"] }))).not.toContain("Example:")
        expect(Bun.stripANSI(CLI.commandHelp(add))).not.toContain("Example:")
    })
})
