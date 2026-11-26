import type { SQLQueryBindings } from "bun:sqlite"
import { JSON } from "@monstermann/stdlib"
import { Database } from "bun:sqlite"
import { describe, expect, it } from "bun:test"
import { LogQuery } from "../src/LogQuery"

type Log = { data: JSON.Object, date: Date, id: string, level: string, message: string }

function local(year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date {
    return new Date(year, month - 1, day, hour, minute, second)
}

function search(logs: Log[], query: string): string {
    const db = new Database(":memory:")
    db.run("CREATE TABLE logs (id TEXT, parentId TEXT, date TEXT, level TEXT, message TEXT, data TEXT) STRICT")
    for (const log of logs) db.run("INSERT INTO logs VALUES (?, NULL, ?, ?, ?, ?)", [log.id, log.date.toISOString(), log.level, log.message, JSON.stringify(log.data)])
    const where = LogQuery.where(LogQuery.parse(query))
    return db.query<{ id: string }, SQLQueryBindings[]>(`SELECT id FROM logs WHERE ${where.sql} ORDER BY id`).all(...where.params).map((row) => row.id).join("")
}

const LOGS: Log[] = [
    { data: { method: "GET", path: "/api/sync" }, date: local(2026, 10, 31, 23, 30), id: "a", level: "info", message: "Request" },
    { data: { duration: 412, status: 500 }, date: local(2026, 11, 1, 0, 30), id: "b", level: "info", message: "Response" },
    { data: { duration: 12, status: 1500 }, date: local(2026, 11, 1, 14, 0, 30), id: "c", level: "debug", message: "Response" },
    { data: { name: "SyncError", stack: "at server/sync.ts", user: { id: 7, name: "Jane" } }, date: local(2026, 11, 1, 23, 59), id: "d", level: "error", message: "Sync failed" },
    { data: { ok: true, status: "500" }, date: local(2026, 11, 2, 9), id: "e", level: "warn", message: "Slow 100% query" },
]

describe("LogQuery", () => {
    it("should match everything without terms", () => {
        expect(search(LOGS, "")).toBe("abcde")
    })

    it("should match words in the message only, ignoring case", () => {
        expect(search(LOGS, "SYNC")).toBe("d")
        expect(search(LOGS, '"sync failed"')).toBe("d")
        expect(search(LOGS, "status")).toBe("")
        expect(search(LOGS, "server")).toBe("")
        expect(search(LOGS, "100%")).toBe("e")
    })

    it("should match any of the levels", () => {
        expect(search(LOGS, "level:warn level:error")).toBe("de")
    })

    it("should match strings in the data by part, ignoring case, and other values exactly", () => {
        expect(search(LOGS, "path:API/SY")).toBe("a")
        expect(search(LOGS, "status:500")).toBe("be")
        expect(search(LOGS, "status:50")).toBe("e")
        expect(search(LOGS, "user.name:jan")).toBe("d")
        expect(search(LOGS, "user.id:7")).toBe("d")
        expect(search(LOGS, "ok:true")).toBe("e")
    })

    it("should compare and match ranges with both ends", () => {
        expect(search(LOGS, "status:>=500 status:<1000")).toBe("b")
        expect(search(LOGS, "duration:12..412")).toBe("bc")
    })

    it("should read dates as local days, minutes and seconds", () => {
        expect(search(LOGS, "date:2026-11-01")).toBe("bcd")
        expect(search(LOGS, "date:>2026-11-01")).toBe("e")
        expect(search(LOGS, "date:<=2026-10-31")).toBe("a")
        expect(search(LOGS, 'date:"2026-11-01 14:00"')).toBe("c")
        expect(search(LOGS, "date:2026-11-01T14:00:30")).toBe("c")
        expect(search(LOGS, "date:2026-10-31..2026-11-01")).toBe("abcd")
        expect(search(LOGS, "date:nonsense")).toBe("")
    })

    it("should read today, yesterday and times of today", () => {
        const now = new Date()
        const logs: Log[] = [
            { data: {}, date: local(now.getFullYear(), now.getMonth() + 1, now.getDate(), 0, 30), id: "a", level: "info", message: "" },
            { data: {}, date: local(now.getFullYear(), now.getMonth() + 1, now.getDate() - 1, 12), id: "b", level: "info", message: "" },
        ]
        expect(search(logs, "date:today")).toBe("a")
        expect(search(logs, "date:yesterday")).toBe("b")
        expect(search(logs, "date:00:30")).toBe("a")
    })

    it("should exclude with -, also logs without the key", () => {
        expect(search(LOGS, "-level:debug -level:info")).toBe("de")
        expect(search(LOGS, "-status:500")).toBe("acd")
        expect(search(LOGS, "-response")).toBe("ade")
        expect(search(LOGS, "-duration:12..412")).toBe("ade")
    })
})
