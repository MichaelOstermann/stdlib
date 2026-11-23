import type { CLI } from "."

/**
 * # resolveArgv
 *
 * Splits the command line into the `path` of the command and its `flags`. `isHelp` is `true` when
 * `--help` or `-h` appears anywhere.
 *
 * ## Example
 *
 * ```ts
 * CLI.resolveArgv(["members", "add", "--email", "a@b.c", "--force", "-h"])
 * // {
 * //     flags: { "--email": [{ index: 2, inline: false, value: "a@b.c" }], "--force": [{ index: 4, inline: false, value: null }] },
 * //     hasFlags: true,
 * //     isHelp: true,
 * //     path: ["members", "add"],
 * //     words: ["members", "add", "--email", "a@b.c", "--force"],
 * // }
 * ```
 */
export function resolveArgv(argv: string[] = process.argv.slice(2)): CLI.ResolvedArgv {
    const words = argv.filter((word) => word !== "--help" && word !== "-h")
    const start = words.findIndex((word) => word.startsWith("-"))
    const path = start === -1 ? words : words.slice(0, start)
    return { flags: readFlags(words, path.length), hasFlags: path.length < words.length, isHelp: words.length < argv.length, path, words }
}

function readFlags(words: string[], start: number): Record<string, CLI.ResolvedFlag[]> {
    const flags: Record<string, CLI.ResolvedFlag[]> = {}
    const add = (name: string, flag: CLI.ResolvedFlag): void => {
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
