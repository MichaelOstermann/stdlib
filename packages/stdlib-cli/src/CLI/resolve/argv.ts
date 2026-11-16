import type { Flag } from "../types"

/** What the command line asks for: see `CLI.resolve.argv`. */
export type ResolvedArgv = {
    flags: Record<string, Flag>
    hasFlags: boolean
    isHelp: boolean
    path: string[]
}

/**
 * # argv
 *
 * Splits the command line into the `path` of the command and its `flags`. `isHelp` is for `--help`
 * or `-h` anywhere.
 *
 * ## Example
 *
 * ```ts
 * CLI.resolve.argv(["members", "add", "--email", "a@b.c", "--force", "-h"])
 * // { flags: { "--email": "a@b.c", "--force": null }, hasFlags: true, isHelp: true, path: ["members", "add"] }
 * ```
 */
export function argv(argv: string[] = process.argv.slice(2)): ResolvedArgv {
    const words = argv.filter((word) => word !== "--help" && word !== "-h")
    const start = words.findIndex((word) => word.startsWith("-"))
    const path = start === -1 ? words : words.slice(0, start)
    const rest = start === -1 ? [] : words.slice(start)
    return { flags: readFlags(rest), hasFlags: rest.length > 0, isHelp: words.length < argv.length, path }
}

function readFlags(words: string[]): Record<string, Flag> {
    const flags: Record<string, Flag> = {}
    for (let index = 0; index < words.length; index++) {
        const word = words[index]!
        const next = words[index + 1]
        const equals = word.indexOf("=")
        if (!word.startsWith("-")) {
            flags[word] = null
            continue
        }
        if (equals !== -1) {
            flags[word.slice(0, equals)] = word.slice(equals + 1)
            continue
        }
        if (next === undefined || next.startsWith("--")) {
            flags[word] = null
            continue
        }
        flags[word] = next
        index++
    }
    return flags
}
