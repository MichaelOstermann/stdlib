import type { TSID } from "@monstermann/stdlib"
import type { Logger } from "../src/Logger"
import { rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { afterEach, describe, expect, it } from "bun:test"
import { SQLiteLogger } from "../src/SQLiteLogger"

function log(id: string, date = new Date().toISOString()): Logger.Log {
    return { data: { id }, date, id: id as TSID, level: "info", message: "Request", parentId: null }
}

const paths: string[] = []

function tempPath(): string {
    const path = `${tmpdir()}/stdlib-logger-${crypto.randomUUID()}.db`
    paths.push(path)
    return path
}

afterEach(() => {
    for (const path of paths.splice(0)) for (const suffix of ["", "-wal", "-shm"]) rmSync(path + suffix, { force: true })
})

describe("SQLiteLogger", () => {
    it("should write logs in batches, and all of them on close", async () => {
        const logger = SQLiteLogger.create({ path: ":memory:" })
        const count = () => logger.db.query<{ count: number }, []>("SELECT COUNT(*) AS count FROM logs").get()!.count
        logger.write(log("a"))
        expect(count()).toBe(0)
        await Bun.sleep(150)
        expect(count()).toBe(1)
        expect(logger.db.query("SELECT data FROM logs").get()).toEqual({ data: '{"id":"a"}' })
        logger.close()
    })

    it("should delete logs once their retention ran out", () => {
        const path = tempPath()
        const writer = SQLiteLogger.create({ path, retention: (entry) => entry.id === "old" ? 1000 : null })
        writer.write(log("old", "2020-01-01T00:00:00.000Z"))
        writer.write(log("kept", "2020-01-01T00:00:00.000Z"))
        writer.close()
        const reader = SQLiteLogger.create({ path })
        expect(reader.db.query("SELECT id FROM logs").all()).toEqual([{ id: "kept" }])
        reader.close()
    })

    it("should set up the schema once", () => {
        const path = tempPath()
        SQLiteLogger.create({ path }).close()
        const logger = SQLiteLogger.create({ path })
        expect(logger.db.query("PRAGMA user_version").get()).toEqual({ user_version: 1 })
        logger.close()
    })
})
