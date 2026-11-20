/** `value` as it would be typed in a shell, in quotes only when it needs them. */
export function quote(value: string): string {
    if (/^[\w@%+=:,./-]+$/.test(value)) return value
    return `'${value.replaceAll("'", "'\\''")}'`
}
