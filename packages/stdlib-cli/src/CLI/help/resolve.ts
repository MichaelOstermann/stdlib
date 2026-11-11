/**
 * # resolve
 *
 * ```ts
 * function CLI.help.resolve(argv: string[]): { argv: string[], isHelp: boolean }
 * ```
 *
 * Whether `argv` asks for help with `--help` or `-h`, anywhere in it, and `argv` without them.
 */
export function resolve(argv: string[]): { argv: string[], isHelp: boolean } {
    const rest = argv.filter((word) => word !== "--help" && word !== "-h")
    return { argv: rest, isHelp: rest.length < argv.length }
}
