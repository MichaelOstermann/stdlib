export function human(): boolean {
    // @types/node types both as TTY streams, but `isTTY` is `undefined` when piped.
    const stdin: { isTTY?: boolean } = process.stdin
    const stdout: { isTTY?: boolean } = process.stdout
    return !!stdin.isTTY && !!stdout.isTTY
}
