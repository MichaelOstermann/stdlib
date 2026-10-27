import type { Command, Option } from "./types"

/** An option as it is written in `CLI.command`, everything can be left out. */
export interface OptionInput {
    default?: string
    desc?: string
    enabled?: boolean
    example?: string
    hidden?: boolean
    optional?: boolean
    parse?: (value: string) => unknown
}

/**
 * What the handler gets for an option: what `parse` resolves to, or the string as given, and
 * `undefined` when it can be missing.
 */
type Value<I> =
    | (I extends { parse: (value: string) => infer V } ? Awaited<V> : string)
    | (I extends { default?: undefined, optional: true } ? undefined : never)

/**
 * # command
 *
 * ```ts
 * function CLI.command(options: {
 *     name: string
 *     desc?: string
 *     enabled?: boolean
 *     hidden?: boolean
 *     commands?: Command[]
 *     options?: Record<string, OptionInput>
 *     handler?: (values) => unknown | Promise<unknown>
 * }): Command
 * ```
 *
 * ## Example
 *
 * ```ts
 * const add = CLI.command({
 *     name: "add",
 *     desc: "Add a member",
 *     options: {
 *         email: { desc: "Email of the member", example: "jane@example.com" },
 *         port: { desc: "Port to listen on", default: "3000", parse: Number },
 *         nickname: { desc: "Nickname of the member", optional: true },
 *     },
 *     handler({ email, port, nickname }) {},
 * });
 * ```
 */
export function command<const I extends Record<string, OptionInput>>(options: {
    commands?: Command[]
    desc?: string
    enabled?: boolean
    hidden?: boolean
    name: string
    options?: I
    handler?: (values: { [K in keyof I]: Value<I[K]> }) => unknown
}): Command {
    const inputs: Record<string, OptionInput> = options.options ?? {}
    const filled: Record<string, Option> = {}
    for (const [name, input] of Object.entries(inputs)) {
        filled[name] = {
            default: input.default,
            desc: input.desc ?? "",
            enabled: input.enabled ?? true,
            example: input.example,
            hidden: input.hidden ?? false,
            optional: input.optional ?? false,
            parse: input.parse ?? ((value) => value),
        }
    }

    return {
        commands: options.commands ?? [],
        desc: options.desc ?? "",
        enabled: options.enabled ?? true,
        handler: options.handler as Command["handler"],
        hidden: options.hidden ?? false,
        name: options.name,
        options: filled,
    }
}
