export function ci(): boolean {
    return !!process.env["CI"]
}
