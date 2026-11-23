import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

function lines(...rows: string[]): string {
    return rows.join("\n")
}

describe("CLI.formatError", () => {
    it("should show the name, the message and the meta", () => {
        expect(CLI.formatError({ message: "Could not add the member", meta: { status: 503 }, name: "HttpError" })).toBe(lines(
            "HttpError: Could not add the member",
            "  status: 503",
        ))
    })

    it("should show the cause below, and its cause below that", () => {
        const root = { message: "Connection refused", meta: { host: "db.miko.dev" }, name: "Error" }
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

    it("should show a failure without a message by its name", () => {
        expect(CLI.formatError({ code: 3 })).toBe(lines("Error", "  code: 3"))
    })
})
