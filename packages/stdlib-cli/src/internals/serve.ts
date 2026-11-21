import type { AnyCommand, CLIInvalidMessageError } from "../CLI/types"
import { JSON } from "@monstermann/stdlib"
import { exec } from "../CLI/exec"
import { resolve } from "../CLI/resolve"

type Message = { argv: string[], id: JSON }

const invalidMessage: CLIInvalidMessageError = {
    message: "Needs to be JSON with an id and argv, a list of strings",
    name: "CLIInvalidMessageError",
}

export async function serve(root: AnyCommand, input: { name: string, rpc: AnyCommand }): Promise<void> {
    for await (const line of console) {
        if (line.trim()) void reply(root, input, line)
    }
}

async function reply(root: AnyCommand, { name, rpc }: { name: string, rpc: AnyCommand }, line: string): Promise<void> {
    const message = JSON.tryParse(line).unwrapOr(null)
    if (!isMessage(message)) return write({ id: idOf(message), ok: false, value: invalidMessage })
    const execution = await exec(root, { argv: resolve.argv(["rpc", ...message.argv]), name, prompt: false, rpc })
    write({ id: message.id, ok: execution.result.ok, value: execution.result.value })
}

function isMessage(value: unknown): value is Message {
    if (typeof value !== "object" || value === null) return false
    if (!("id" in value) || !("argv" in value)) return false
    return Array.isArray(value.argv) && value.argv.every((word) => typeof word === "string")
}

function idOf(value: unknown): JSON {
    if (typeof value === "object" && value !== null && "id" in value) return value.id as JSON
    return null
}

function write(reply: { id: JSON, ok: boolean, value: unknown }): void {
    process.stdout.write(`${JSON.stringify(reply)}\n`)
}
