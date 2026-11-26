import type { Logger as LoggerType } from "../src/Logger"
import { describe, expect, it } from "bun:test"
import { Logger } from "../src/Logger"

describe("Logger", () => {
    it("should write logs with their level, data and id", () => {
        const logs: LoggerType.Log[] = []
        const logger = Logger.create((log) => logs.push(log))
        const id = logger.info("Request", { path: "/api/sync" })
        expect(logs).toEqual([{ data: { path: "/api/sync" }, date: expect.any(String), id, level: "info", message: "Request", parentId: null }])
    })

    it("should give the logs of a child its parent id", () => {
        const logs: LoggerType.Log[] = []
        const logger = Logger.create((log) => logs.push(log))
        const requestId = logger.info("Request")
        logger.child(requestId).warn("Slow query")
        expect(logs[1]).toMatchObject({ data: {}, level: "warn", message: "Slow query", parentId: requestId })
    })

    it("should log a failure as the data, with its message", () => {
        const logs: LoggerType.Log[] = []
        const logger = Logger.create((log) => logs.push(log))
        const failure = { message: "Sync failed", name: "SyncError", repo: "miko2" }
        logger.error(failure)
        expect(logs[0]).toMatchObject({ data: failure, level: "error", message: "Sync failed" })
    })
})
