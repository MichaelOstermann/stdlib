/**
 * # isInteractive
 *
 * ```ts
 * function CLI.isInteractive(): boolean
 * ```
 *
 * Whether a person is typing at a terminal: stdin and stdout are both a TTY. Scripts, pipes, CI and
 * most agents are not.
 */
export function isInteractive(): boolean {
    // @types/node types both as TTY streams, but `isTTY` is `undefined` when piped.
    const stdin: { isTTY?: boolean } = process.stdin
    const stdout: { isTTY?: boolean } = process.stdout
    return !!stdin.isTTY && !!stdout.isTTY
}
