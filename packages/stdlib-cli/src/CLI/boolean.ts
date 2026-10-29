import type { Token } from "../internals/Tokens"
import type { OptionInput } from "./command"

/** What a switch can be given, in any case. */
const VALUES = new Map([["false", false], ["no", false], ["off", false], ["on", true], ["true", true], ["yes", true]])

/**
 * # boolean
 *
 * ```ts
 * function CLI.boolean(options?: {
 *     desc?: string
 *     enabled?: boolean
 *     hidden?: boolean
 * }): OptionInput
 * ```
 *
 * An option that is on when its flag is given, without a value: `--json` is `true`, leaving it out
 * is `false`. It also takes `true`/`false`, `yes`/`no` and `on`/`off` in any case, after it or
 * after `=`: `--json no`, `--json=OFF`.
 *
 * ## Example
 *
 * ```ts
 * const list = CLI.command({
 *     name: "list",
 *     options: { json: CLI.boolean({ desc: "Print JSON" }) },
 *     handler({ json }) {},
 * });
 * ```
 */
export function boolean<const I extends Pick<OptionInput, "desc" | "enabled" | "hidden">>(options?: I): I & {
    default: string
    usage: string
    parse: (value: string) => boolean
    read: (token: Token) => string | undefined
} {
    return {
        ...options!,
        default: "false",
        read,
        usage: "",
        parse: (value) => {
            const on = VALUES.get(value.toLowerCase())
            if (on === undefined) throw new Error("Not yes or no")
            return on
        },
    }
}

/** `true`, or the word after it when it says on or off, or the value after `=`. */
function read(token: Token): string {
    const next = token.next
    if (!next || next.isFlag()) return "true"
    if (next.index !== token.index && !VALUES.has(next.value.toLowerCase())) return "true"
    next.remove()
    return next.value
}
