import { Err, Ok } from "@monstermann/stdlib"
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
    return CLI.exec(miko, { argv: CLI.resolve.argv(line.split(" ")), name: "miko", prompt: false, rpc })
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

    it("should underline an unknown command", async () => {
        expect(await show("membres add")).toBe([
            "Unknown command, did you mean: members?",
            "miko membres add",
            "     ^^^^^^^",
            "",
            "See miko --help for more",
        ].join("\n"))
        expect(await show("members nope")).toBe("Unknown command\nmiko members nope\n             ^^^^\n\nSee miko members --help for more")
    })

    it("should tell a word after a command without commands what it could be", async () => {
        expect(await show("members add email a@b.c")).toStartWith("Options start with --, did you mean: --email?\nmiko members add email a@b.c\n                 ^^^^^")
        expect(await show("members add nope")).toBe([
            "Not a command or option",
            "miko members add nope",
            "                 ^^^^",
            "",
            "See miko members add --help for more",
        ].join("\n"))
    })

    it("should underline unknown options", async () => {
        expect(await show("members add --emial a@b.c")).toBe([
            "Unknown option, did you mean: --email?",
            "miko members add --emial a@b.c",
            "                 ^^^^^^^",
            "",
            "See miko members add --help for more",
        ].join("\n"))
        expect(await show("members add -e a@b.c")).toStartWith("Options start with --, did you mean: --email?")
        expect(await show("members add -x a@b.c")).toContain("Unknown option\nmiko members add -x a@b.c\n                 ^^")
    })

    it("should underline the whole value when words that belong to no flag need quotes", async () => {
        expect(await show("members add --email a@b.c x y")).toStartWith("Values with spaces need quotes, did you mean: 'a@b.c x y'?\nmiko members add --email a@b.c x y\n                         ^^^^^^^^^")
        expect(await show("members add --email=a@b.c x")).toStartWith("Values with spaces need quotes, did you mean: 'a@b.c x'?\nmiko members add --email=a@b.c x\n                         ^^^^^^^")
    })

    it("should underline the flags used more than once, and only the value of --flag=value", async () => {
        expect(await show("members add --email a@b.c --email=b@c.d")).toStartWith("Options can only be used once\nmiko members add --email a@b.c --email=b@c.d\n                 ^^^^^^^       ^^^^^^^")
        const role = CLI.command().options({ role: CLI.enum().options({ admin: "", viewer: "" }) }).action(() => {})
        const execution = await CLI.exec(CLI.command().commands({ role }), { argv: CLI.resolve.argv(["role", "--role=admn"]), name: "miko", prompt: false })
        expect(Bun.stripANSI(CLI.format.exec(execution))).toStartWith("Unknown value, did you mean: admin?\nmiko role --role=admn\n                 ^^^^")
    })

    it("should leave out a missing option that a suggestion already covers", async () => {
        expect(await show("members add --emial a@b.c")).not.toContain("Missing option")
        expect(await show("members add")).toBe("Missing option --email\n\nSee miko members add --help for more")
        const add = CLI.command().options({ email: CLI.string().example("a@b.c") }).action(() => {})
        const execution = await CLI.exec(CLI.command().commands({ add }), { argv: CLI.resolve.argv(["add"]), name: "miko", prompt: false })
        expect(Bun.stripANSI(CLI.format.exec(execution))).toStartWith("Missing option --email, for example: --email a@b.c")
    })

    it("should show what was thrown", async () => {
        expect(await show("members add --email crash@miko.dev")).toBe("Error: Database went away")
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
