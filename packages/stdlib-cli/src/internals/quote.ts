/** Returns `value` as a person would type it in a shell. Adds quotes only when needed. */
export function quote(value: string): string {
    if (/^[\w@%+=:,./-]+$/.test(value)) return value
    return `'${value.replaceAll("'", "'\\''")}'`
}
