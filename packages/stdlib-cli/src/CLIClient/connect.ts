import type { CLIClient } from "."

export interface CLIClientTransport {
    /** Calls `callback` with each line the program prints. */
    onLine: (callback: (line: string) => void) => void
    /** Sends one line, with its `\n`, to the program. */
    send: (line: string) => void
}

type Reply = { id: number, ok: boolean, value: unknown }

/**
 * # connect
 *
 * Calls the commands of a program that runs as `rpc`, each as a function that resolves with `Ok` or
 * `Err`. Calls can overlap.
 *
 * ## Example
 *
 * ```ts
 * const child = Bun.spawn(["miko", "rpc"], { stdin: "pipe", stdout: "pipe" })
 *
 * const miko = CLIClient.connect<typeof program>({
 *     onLine: async (callback) => {
 *         let rest = ""
 *         for await (const chunk of child.stdout.pipeThrough(new TextDecoderStream())) {
 *             const lines = (rest + chunk).split("\n")
 *             rest = lines.pop()!
 *             lines.forEach(callback)
 *         }
 *     },
 *     send: (line) => {
 *         child.stdin.write(line)
 *         child.stdin.flush()
 *     },
 * })
 *
 * await miko.members.add({ email: "a@b.c" }) // Ok({ email: "a@b.c" })
 * ```
 */
export function connect<X>(transport: CLIClientTransport): CLIClient<X> {
    const pending = new Map<number, (result: Result<unknown, unknown>) => void>()
    let nextId = 0

    transport.onLine((line) => {
        const reply = JSON.tryParse(line).unwrapOr(undefined) as Reply | undefined
        const resolve = reply && pending.get(reply.id)
        if (!reply || !resolve) return
        pending.delete(reply.id)
        resolve(reply.ok ? Ok(reply.value) : Err(reply.value))
    })

    function call(path: string[], options: Record<string, unknown> = {}): Promise<Result<unknown, unknown>> {
        const id = nextId++
        const argv = [...path, ...flagsOf(options)]
        return new Promise((resolve) => {
            pending.set(id, resolve)
            transport.send(`${JSON.stringify({ argv, id })}\n`)
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
