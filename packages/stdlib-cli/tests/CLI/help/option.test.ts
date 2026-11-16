import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

describe("CLI.help.option", () => {
    it("should list the options of an enum without a default", () => {
        expect(Bun.stripANSI(CLI.help.option("role", CLI.enum().options({ admin: "", member: "" }), 6))).toBe("  --role  (options: admin, member)")
    })

    it("should quote examples the way a shell needs them", () => {
        const help = (example: string): string => Bun.stripANSI(CLI.help.option("name", CLI.string().example(example), 6))
        expect(help("jane@doe.com")).toBe("  --name  (example: jane@doe.com)")
        expect(help("Jane Doe")).toBe("  --name  (example: 'Jane Doe')")
        expect(help("it's $HOME")).toBe("  --name  (example: 'it'\\''s $HOME')")
    })

    it("should not show the default of a sensitive option, only that it can be left out", () => {
        expect(Bun.stripANSI(CLI.help.option("password", CLI.string().desc("Your password").default("hunter2").sensitive(true), 10))).toBe("  --password  Your password (optional)")
    })
})
