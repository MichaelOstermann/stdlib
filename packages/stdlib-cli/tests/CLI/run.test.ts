import { Err, Ok } from "@monstermann/stdlib"
import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

const add = CLI
    .command()
    .options({ email: CLI.string() })
    .action(({ email }) => {
        if (email === "taken@miko.dev") return Err("This email is already a member")
        return Ok({ email })
    })
const miko = CLI.command().commands({ add })

async function run(line: string): Promise<{ exitCode: number | string | undefined, stderr: string, stdout: string }> {
    const written = { stderr: "", stdout: "" }
    const saved = { exitCode: process.exitCode, stderr: process.stderr.write, stdout: process.stdout.write }
    process.stdout.write = (text: string) => {
        written.stdout += text
        return true
    }
    process.stderr.write = (text: string) => {
        written.stderr += text
        return true
    }
    process.exitCode = 0
    try {
        await CLI.run(miko, { argv: CLI.resolve.argv(line.split(" ")), name: "miko", prompt: false, rpc: CLI.command().commands({ add }) })
        return { exitCode: process.exitCode, ...written }
    }
    finally {
        process.stdout.write = saved.stdout
        process.stderr.write = saved.stderr
        process.exitCode = saved.exitCode
    }
}

describe("CLI.run", () => {
    it("should print what the action returned", async () => {
        expect(await run("add --email a@b.c")).toEqual({ exitCode: 0, stderr: "", stdout: "email: a@b.c\n" })
    })

    it("should print what went wrong to stderr and fail", async () => {
        expect(await run("add --email taken@miko.dev")).toMatchObject({ exitCode: 1, stdout: "" })
    })

    it("should print JSON to stdout under rpc, also when it fails", async () => {
        expect(await run("rpc add --email taken@miko.dev")).toEqual({
            exitCode: 1,
            stderr: "",
            stdout: '{"ok":false,"value":{"message":"This email is already a member","name":"Error"}}\n',
        })
    })
})
