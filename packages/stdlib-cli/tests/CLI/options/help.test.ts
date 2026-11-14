import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

describe("CLI.options.help", () => {
    it("should list required options first, then the others with what they fall back to", () => {
        const help = CLI.options.help({
            email: CLI.string().desc("Their email address").example("jane@doe.com"),
            firstName: CLI.string().desc("Their first name").optional(true).example("Jane Doe"),
            help: CLI.boolean().desc("Show this help"),
            notify: CLI.boolean().desc("Send them an email"),
            role: CLI.enum().desc("What they are allowed to do").options({ admin: "", member: "" }).default("member"),
            team: CLI.string().desc("Their team"),
        })
        expect(Bun.stripANSI(help)).toBe([
            "Options:",
            "  --email       Their email address (example: jane@doe.com)",
            "  --team        Their team",
            "  --first-name  Their first name (example: 'Jane Doe', optional)",
            "  --help        Show this help",
            "  --notify      Send them an email (default: false)",
            "  --role        What they are allowed to do (default: member, options: admin, member)",
        ].join("\n"))
    })

    it("should list the options of an enum without a default", () => {
        const help = CLI.options.help({ role: CLI.enum().options({ admin: "", member: "" }) })
        expect(Bun.stripANSI(help)).toBe("Options:\n  --role  (options: admin, member)")
    })

    it("should quote examples the way a shell needs them", () => {
        const help = (example: string): string => Bun.stripANSI(CLI.options.help({ name: CLI.string().example(example) }))
        expect(help("jane@doe.com")).toBe("Options:\n  --name  (example: jane@doe.com)")
        expect(help("Jane Doe")).toBe("Options:\n  --name  (example: 'Jane Doe')")
        expect(help("it's $HOME")).toBe("Options:\n  --name  (example: 'it'\\''s $HOME')")
    })

    it("should not show the default of a sensitive option, only that it can be left out", () => {
        const help = CLI.options.help({ password: CLI.string().desc("Your password").default("hunter2").sensitive(true) })
        expect(Bun.stripANSI(help)).toBe("Options:\n  --password  Your password (optional)")
    })

    it("should be empty without options", () => {
        expect(CLI.options.help({})).toBe("")
    })
})
