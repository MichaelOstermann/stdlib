import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

describe("CLI.optionsHelp", () => {
    it("should list required options first, then the others with what they fall back to", () => {
        expect(Bun.stripANSI(CLI.optionsHelp({
            email: CLI.string().desc("Their email address").example("jane@doe.com"),
            firstName: CLI.string().desc("Their first name").optional(true).example("Jane Doe"),
            notify: CLI.boolean().desc("Send them an email"),
            reply: CLI.boolean().desc("Ask for a reply").default(true),
            role: CLI.enum().desc("What they are allowed to do").options({ admin: "", member: "" }).default("member"),
            team: CLI.string().desc("Their team"),
        }))).toBe([
            "Options:",
            "  --email       Their email address (example: jane@doe.com)",
            "  --team        Their team",
            "  --first-name  Their first name (example: 'Jane Doe', optional)",
            "  --notify      Send them an email",
            "  --reply       Ask for a reply (default: true)",
            "  --role        What they are allowed to do (default: member, options: admin, member)",
        ].join("\n"))
    })
})
