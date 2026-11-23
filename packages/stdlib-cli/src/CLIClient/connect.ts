import type { Result } from "@monstermann/stdlib"
import type { CLIClient } from "."
import { Err, JSON, Ok, String } from "@monstermann/stdlib"

type Reply = { id: number, ok: boolean, value: unknown }

/**
 * # connect
 *
 * Connects to a program that runs as `rpc`. Each command becomes a function that resolves with `Ok`
 * or `Err`. Calls can overlap.
 *
 * ## Example
 *
 * ```ts
 * const child = Bun.spawn(["miko", "rpc"], { stdin: "pipe", stdout: "pipe" })
 *
 * const miko = CLIClient.connect<typeof rpc>({
 *     request: (text) => {
 *         child.stdin.write(text)
 *         child.stdin.flush()
 *     },
 *     response: async (callback) => {
 *         for await (const text of child.stdout.pipeThrough(new TextDecoderStream())) callback(text)
 *     },
 * })
 *
 * await miko.members.add({ email: "a@b.c" }) // Ok({ email: "a@b.c" })
 * ```
 */
export function connect<X>(transport: CLIClient.Transport): CLIClient<X> {
    const pending = new Map<number, (result: Result<unknown, unknown>) => void>()
    let nextId = 0
    let rest = ""

    transport.response((text) => {
        const lines = (rest + text).split("\n")
        rest = lines.pop()!
        for (const line of lines) settle(line)
    })

    function settle(line: string): void {
        const reply = JSON.tryParse(line).unwrapOr(undefined) as Reply | undefined
        const resolve = reply && pending.get(reply.id)
        if (!reply || !resolve) return
        pending.delete(reply.id)
        resolve(reply.ok ? Ok(reply.value) : Err(reply.value))
    }

    function call(path: string[], options: Record<string, unknown> = {}): Promise<Result<unknown, unknown>> {
        const id = nextId++
        const argv = [...path, ...flagsOf(options)]
        return new Promise((resolve) => {
            pending.set(id, resolve)
            transport.request(`${JSON.stringify({ argv, id })}\n`)
        })
    }

    function commandAt(path: string[]): unknown {
        return new Proxy(() => {}, {
            apply: (_target, _this, [options]: [Record<string, unknown>?]) => call(path, options),
            get: (_target, key) => typeof key === "string" && key !== "then" ? commandAt([...path, key]) : undefined,
        })
    }

    return commandAt([]) as CLIClient<X>
}

function flagsOf(options: Record<string, unknown>): string[] {
    return Object
        .entries(options)
        .filter(([, value]) => value !== undefined)
        .map(([name, value]) => `--${String.kebabCase(name)}=${String(value)}`)
}
