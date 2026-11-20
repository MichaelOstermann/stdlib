import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

const add = CLI.command().desc("Add a member\nThey get an email.").options({ email: CLI.string().desc("Their email address") }).action(() => {})

const remove = CLI.command().action(() => {})

const members = CLI.command().desc("Manage who has access\nAdd and remove them.").commands({ add, remove })

describe("CLI.help.command", () => {
    it("should show the whole description and the options, the given ones last", () => {
        expect(Bun.stripANSI(CLI.help.command(add, { globalOptions: { help: CLI.boolean().desc("Show this help") } }))).toBe([
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

    it("should show an example with every required option, when each of them has one", () => {
        const invite = CLI.command().options({
            email: CLI.string().example("jane@miko.dev"),
            name: CLI.string().example("Jane Doe"),
            note: CLI.string().optional(true).example("Hi"),
            notify: CLI.boolean(),
            role: CLI.enum().options({ admin: "", viewer: "" }),
        }).action(() => {})
        expect(Bun.stripANSI(CLI.help.command(invite, { path: ["miko", "invite"] }))).toStartWith("Example:\n  miko invite --email jane@miko.dev --name 'Jane Doe' --role admin\n")
    })

    it("should show no example when a required option has none, is sensitive, or there is no path", () => {
        const withoutExample = CLI.command().options({ email: CLI.string() }).action(() => {})
        const sensitive = CLI.command().options({ password: CLI.string().sensitive(true).example("hunter2") }).action(() => {})
        const optional = CLI.command().options({ note: CLI.string().optional(true).example("Hi") }).action(() => {})
        expect(Bun.stripANSI(CLI.help.command(withoutExample, { path: ["miko"] }))).not.toContain("Example:")
        expect(Bun.stripANSI(CLI.help.command(sensitive, { path: ["miko"] }))).not.toContain("Example:")
        expect(Bun.stripANSI(CLI.help.command(optional, { path: ["miko"] }))).not.toContain("Example:")
        expect(Bun.stripANSI(CLI.help.command(add))).not.toContain("Example:")
    })
})
