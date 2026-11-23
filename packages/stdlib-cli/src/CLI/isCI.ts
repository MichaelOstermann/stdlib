export function isCI(): boolean {
    return !!process.env["CI"]
}
