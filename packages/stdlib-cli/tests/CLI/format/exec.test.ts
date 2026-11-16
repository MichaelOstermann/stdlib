import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

const add = CLI
    .command()
    .desc("Add a member")
    .options({ email: CLI.string().desc("Their email address") })
    .action(({ email }) => {
        if (email === "taken@miko.dev") return Err("This email is already a member")
        if (email === "crash@miko.dev") throw new Error("Database went away")
        if (email === "quiet@miko.dev") return
        return Ok({ email })
    })

const members = CLI.command().desc("Manage who has access").commands({ add })

const rpc = CLI.command().commands({ members })

const miko = CLI.command().desc("Everything miko").commands({ members })

function exec(line: string): ReturnType<typeof CLI.exec> {
    return CLI.exec(miko, { argv: CLI.resolve.argv(line.split(" ")), prompt: false, rpc })
}

async function show(line: string): Promise<string> {
    return Bun.stripANSI(CLI.format.exec(await exec(line)))
}

describe("CLI.format.exec", () => {
    it("should show what the action returned", async () => {
        expect(await show("members add --email a@b.c")).toBe("email: a@b.c")
        expect(await show("members add --email quiet@miko.dev")).toBe("")
    })

    it("should show a failure", async () => {
        expect(await show("members add --email taken@miko.dev")).toBe("Error: This email is already a member")
    })

    it("should suggest commands and options", async () => {
        expect(await show("membres")).toBe("Unknown command membres, did you mean: members?")
        expect(await show("members nope")).toBe("Unknown command nope")
        expect(await show("members add --emial a@b.c x")).toBe([
            "Invalid option --email: Required",
            "Unknown option --emial, did you mean: --email?",
            "Unknown option x",
        ].join("\n"))
    })

    it("should show the help for --help anywhere, and for commands without an action", async () => {
        expect(await show("members add --email a@b.c --help")).toStartWith("Description:\n  Add a member\n")
        expect(await show("members add --email a@b.c --help")).toContain("  --help   Show this help")
        expect(await show("members")).toStartWith("Description:\n  Manage who has access\n")
    })

    it("should show JSON under rpc", async () => {
        expect(await show("rpc members add --email a@b.c")).toBe('{"ok":true,"value":{"email":"a@b.c"}}')
        expect(await show("rpc members add --email taken@miko.dev")).toBe('{"ok":false,"value":{"message":"This email is already a member","name":"Error"}}')
        expect(await show("rpc members nope")).toBe('{"ok":false,"value":{"message":"Unknown command nope","name":"CLIUnknownCommandError"}}')
    })
})
