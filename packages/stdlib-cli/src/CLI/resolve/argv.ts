import type { Flag } from "../types"

/** What the command line asks for: see `CLI.resolve.argv`. */
export type ResolvedArgv = {
    flags: Record<string, ResolvedFlag[]>
    hasFlags: boolean
    isHelp: boolean
    path: string[]
    words: string[]
}

/** One use of a flag, `index` being where it is in `words`, `inline` for `--email=a@b.c`. */
export type ResolvedFlag = { index: number, inline: boolean, value: Flag }

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
 * // {
 * //     flags: { "--email": [{ index: 2, inline: false, value: "a@b.c" }], "--force": [{ index: 4, inline: false, value: null }] },
 * //     hasFlags: true,
 * //     isHelp: true,
 * //     path: ["members", "add"],
 * //     words: ["members", "add", "--email", "a@b.c", "--force"],
 * // }
 * ```
 */
export function argv(argv: string[] = process.argv.slice(2)): ResolvedArgv {
    const words = argv.filter((word) => word !== "--help" && word !== "-h")
    const start = words.findIndex((word) => word.startsWith("-"))
    const path = start === -1 ? words : words.slice(0, start)
    return { flags: readFlags(words, path.length), hasFlags: path.length < words.length, isHelp: words.length < argv.length, path, words }
}

function readFlags(words: string[], start: number): Record<string, ResolvedFlag[]> {
    const flags: Record<string, ResolvedFlag[]> = {}
    const add = (name: string, flag: ResolvedFlag): void => {
        flags[name] = [...flags[name] ?? [], flag]
    }
    for (let index = start; index < words.length; index++) {
        const word = words[index]!
        const next = words[index + 1]
        const equals = word.indexOf("=")
        if (!word.startsWith("-")) {
            add(word, { index, inline: false, value: null })
            continue
        }
        if (equals !== -1) {
            add(word.slice(0, equals), { index, inline: true, value: word.slice(equals + 1) })
            continue
        }
        if (next === undefined || next.startsWith("--")) {
            add(word, { index, inline: false, value: null })
            continue
        }
        add(word, { index, inline: false, value: next })
        index++
    }
    return flags
}
