import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

function lines(...rows: string[]): string {
    return rows.join("\n")
}

describe("CLI.formatError", () => {
    it("should show the name, the message and the details", () => {
        expect(CLI.formatError({ message: "Could not add the member", name: "HttpError", status: 503 })).toBe(lines(
            "HttpError: Could not add the member",
            "  status: 503",
        ))
    })

    it("should show the cause below, and its cause below that", () => {
        const root = { host: "db.miko.dev", message: "Connection refused", name: "Error" }
        const failure = { cause: { cause: root, message: "Query failed", name: "QueryError" }, message: "Could not add the member", name: "SaveError" }
        expect(CLI.formatError(failure)).toBe(lines(
            "SaveError: Could not add the member",
            "  cause: QueryError: Query failed",
            "    cause: Error: Connection refused",
            "      host: db.miko.dev",
        ))
    })

    it("should show the errors it is made of", () => {
        const failure = new AggregateError([new Error("First failed"), { code: 3 }], "Several failed")
        expect(CLI.formatError(failure)).toBe(lines(
            "AggregateError: Several failed",
            "  errors:",
            "    - Error: First failed",
            "    - Error",
            "        code: 3",
        ))
    })

    it("should show the stack below the details with stack, without the line that repeats the header", () => {
        const failure = { message: "Sync failed", name: "SyncError", repo: "miko2", stack: "SyncError: Sync failed\n    at sync (sync.ts:12:5)\n    at handler (http.ts:93:20)" }
        expect(CLI.formatError(failure)).toBe(lines("SyncError: Sync failed", "  repo: miko2"))
        expect(CLI.formatError(failure, { stack: true })).toBe(lines(
            "SyncError: Sync failed",
            "  repo: miko2",
            "  at sync (sync.ts:12:5)",
            "  at handler (http.ts:93:20)",
        ))
    })

    it("should show a failure without a message by its name", () => {
        expect(CLI.formatError({ code: 3 })).toBe(lines("Error", "  code: 3"))
    })
})
