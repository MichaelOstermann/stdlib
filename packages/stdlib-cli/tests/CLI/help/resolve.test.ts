import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

describe("CLI.help.resolve", () => {
    it("should find --help and -h anywhere and take them out", () => {
        expect(CLI.help.resolve(["members", "--help", "add"])).toEqual({ argv: ["members", "add"], isHelp: true })
        expect(CLI.help.resolve(["members", "add", "-h"])).toEqual({ argv: ["members", "add"], isHelp: true })
        expect(CLI.help.resolve(["-h", "--help"])).toEqual({ argv: [], isHelp: true })
    })

    it("should leave argv as it is without them", () => {
        expect(CLI.help.resolve(["members", "add", "--email", "a@b.c"])).toEqual({ argv: ["members", "add", "--email", "a@b.c"], isHelp: false })
        expect(CLI.help.resolve(["--helpful"])).toEqual({ argv: ["--helpful"], isHelp: false })
    })
})
