import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

describe("CLI.resolveArgv", () => {
    it("should split the names of the command from the flags", () => {
        expect(CLI.resolveArgv(["members", "add", "--email", "a@b.c"])).toEqual({
            flags: { "--email": [{ index: 2, inline: false, value: "a@b.c" }] },
            hasFlags: true,
            isHelp: false,
            path: ["members", "add"],
            words: ["members", "add", "--email", "a@b.c"],
        })
        expect(CLI.resolveArgv(["members"])).toEqual({ flags: {}, hasFlags: false, isHelp: false, path: ["members"], words: ["members"] })
    })

    it("should find --help and -h anywhere and take them out", () => {
        expect(CLI.resolveArgv(["members", "--help", "add"])).toMatchObject({ flags: {}, hasFlags: false, isHelp: true, path: ["members", "add"], words: ["members", "add"] })
        expect(CLI.resolveArgv(["members", "add", "-h"])).toMatchObject({ isHelp: true, path: ["members", "add"] })
        expect(CLI.resolveArgv(["--helpful"])).toMatchObject({ flags: { "--helpful": [{ index: 0, inline: false, value: null }] }, isHelp: false })
    })

    it("should read values after the flag and after =, and keep every use", () => {
        expect(CLI.resolveArgv(["--email", "a@b.c", "--email=c@d.e"]).flags).toEqual({ "--email": [{ index: 0, inline: false, value: "a@b.c" }, { index: 2, inline: true, value: "c@d.e" }] })
        expect(CLI.resolveArgv(["--email=", "--amount", "-5"]).flags).toEqual({ "--amount": [{ index: 1, inline: false, value: "-5" }], "--email": [{ index: 0, inline: true, value: "" }] })
    })

    it("should give flags without a value null, and words that belong to no flag too", () => {
        expect(CLI.resolveArgv(["--force", "--email", "a@b.c", "x"]).flags).toEqual({
            "--email": [{ index: 1, inline: false, value: "a@b.c" }],
            "--force": [{ index: 0, inline: false, value: null }],
            "x": [{ index: 3, inline: false, value: null }],
        })
    })
})
