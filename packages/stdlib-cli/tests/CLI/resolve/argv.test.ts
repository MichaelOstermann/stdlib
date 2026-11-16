import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

describe("CLI.resolve.argv", () => {
    it("should split the names of the command from the flags", () => {
        expect(CLI.resolve.argv(["members", "add", "--email", "a@b.c"])).toEqual({ flags: { "--email": "a@b.c" }, hasFlags: true, isHelp: false, path: ["members", "add"] })
        expect(CLI.resolve.argv(["members"])).toEqual({ flags: {}, hasFlags: false, isHelp: false, path: ["members"] })
    })

    it("should find --help and -h anywhere and take them out", () => {
        expect(CLI.resolve.argv(["members", "--help", "add"])).toMatchObject({ flags: {}, hasFlags: false, isHelp: true, path: ["members", "add"] })
        expect(CLI.resolve.argv(["members", "add", "-h"])).toMatchObject({ isHelp: true, path: ["members", "add"] })
        expect(CLI.resolve.argv(["--helpful"])).toMatchObject({ flags: { "--helpful": null }, isHelp: false })
    })

    it("should read values after the flag and after =, the last one winning", () => {
        expect(CLI.resolve.argv(["--email", "a@b.c", "--email=c@d.e"]).flags).toEqual({ "--email": "c@d.e" })
        expect(CLI.resolve.argv(["--email=", "--amount", "-5"]).flags).toEqual({ "--amount": "-5", "--email": "" })
    })

    it("should give flags without a value null, and words that belong to no flag too", () => {
        expect(CLI.resolve.argv(["--force", "--email", "a@b.c", "x"]).flags).toEqual({ "--email": "a@b.c", "--force": null, "x": null })
    })
})
