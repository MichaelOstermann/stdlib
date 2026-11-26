import { describe, expect, it } from "bun:test"
import { LogCompletion } from "../src/LogCompletion"

const FIELDS = new Map([
    ["path", ["/api/sync", "/api/members"]],
    ["status", ["200", "500"]],
    ["stack", []],
    ["user.name", ["Jane Doe"]],
])

describe("LogCompletion", () => {
    it("should complete keys with a colon", () => {
        expect(LogCompletion.complete("st", FIELDS)).toEqual({ options: ["status:", "stack:"], typed: "st" })
        expect(LogCompletion.complete("level:error -le", FIELDS)).toEqual({ options: ["level:"], typed: "le" })
    })

    it("should not complete an empty term", () => {
        expect(LogCompletion.complete("level:error ", FIELDS).options).toEqual([])
    })

    it("should complete values of the key, also after a comparison", () => {
        expect(LogCompletion.complete("path:/api/s", FIELDS)).toEqual({ options: ["/api/sync"], typed: "/api/s" })
        expect(LogCompletion.complete("status:>=", FIELDS)).toEqual({ options: ["200", "500"], typed: "" })
        expect(LogCompletion.complete("level:", FIELDS).options).toEqual(["debug", "info", "warn", "error"])
        expect(LogCompletion.complete("date:to", FIELDS).options).toEqual(["today"])
    })

    it("should quote values with spaces and leave out complete values", () => {
        expect(LogCompletion.complete("user.name:j", FIELDS).options).toEqual(['"Jane Doe"'])
        expect(LogCompletion.complete("status:500", FIELDS).options).toEqual([])
    })
})
