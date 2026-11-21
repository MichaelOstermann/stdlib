import { Err, Ok } from "@monstermann/stdlib"
import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

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

describe("CLI.exec", () => {
    it("should give what the action returns, the command and the options", async () => {
        const execution = await exec("members add --email a@b.c")
        expect(execution.result).toEqual(Ok({ email: "a@b.c" }))
        expect(execution.command?.path).toEqual(["members", "add"])
        expect(execution.options).toEqual({ email: "a@b.c" })
    })

    it("should give null when the action returns nothing", async () => {
        expect((await exec("members add --email quiet@miko.dev")).result).toEqual(Ok(null))
    })

    it("should give what the action fails with, and what it throws", async () => {
        expect((await exec("members add --email taken@miko.dev")).result).toEqual(Err({ message: "This email is already a member", name: "Error" }))
        expect((await exec("members add --email crash@miko.dev")).result.value).toMatchObject({ cause: { message: "Database went away", name: "Error" }, name: "CLIInternalError" })
    })

    it("should fail for an unknown command", async () => {
        expect((await exec("members nope add")).result).toEqual(Err({ message: "Unknown command nope", name: "CLIUnknownCommandError" }))
    })

    it("should fail for wrong options", async () => {
        expect((await exec("members add")).result).toEqual(Err({
            errors: [{ message: "Required", meta: { option: "email" }, name: "CLIMissingOptionError" }],
            message: "Invalid options",
            name: "CLIOptionsError",
        }))
    })

    it("should be help for --help and commands without an action", async () => {
        expect(await exec("members add --email a@b.c --help")).toMatchObject({ isHelp: true, result: Ok(null) })
        expect(await exec("members")).toMatchObject({ isHelp: true, result: Ok(null) })
    })

    it("should run the commands under rpc like any other", async () => {
        expect(await exec("rpc members add --email a@b.c")).toMatchObject({ isRPC: true, result: Ok({ email: "a@b.c" }) })
        expect(await exec("rpc nope")).toMatchObject({ isRPC: true })
    })

    it("should know rpc by the command, not by its name", async () => {
        const own = CLI.command().commands({ rpc: CLI.command().action(() => Ok(1)) })
        const execution = await CLI.exec(own, { argv: CLI.resolve.argv(["rpc"]), name: "miko", prompt: false })
        expect(execution).toMatchObject({ isRPC: false, result: Ok(1) })
    })
})
