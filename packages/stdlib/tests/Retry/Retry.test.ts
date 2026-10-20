import type { Result } from "../../src/Result"
import { describe, expect, it } from "bun:test"
import { Err, Ok } from "../../src/Result"
import { Retry } from "../../src/Retry/index"

const sleep = (): Promise<void> => Promise.resolve()

describe("Retry", () => {
    it("should return what succeeded right away", async () => {
        let calls = 0
        const result = await Retry.run(() => {
            calls++
            return Ok(1)
        })
        expect(result).toEqual(Ok(1))
        expect(calls).toBe(1)
    })

    it("should return a failure that is not worth trying again for", async () => {
        let calls = 0
        const result = await Retry.run(() => {
            calls++
            return Err("failed")
        }, { sleep })
        expect(result).toEqual(Err("failed"))
        expect(calls).toBe(1)
    })

    it("should try again until something else is returned", async () => {
        const attempts: number[] = []
        const result = await Retry.run(async (attempt) => {
            attempts.push(attempt)
            return attempt < 3 ? Retry.again("busy") : Ok("done")
        }, { sleep })
        expect(result).toEqual(Ok("done"))
        expect(attempts).toEqual([0, 1, 2, 3])
    })

    it("should wait longer every time, and as long as asked for", async () => {
        const delays: number[] = []
        await Retry.run((attempt) => attempt === 2 ? Retry.again("busy", 50) : attempt < 5 ? Retry.again("busy") : Ok(), {
            jitter: 0,
            maxDelay: 5000,
            minDelay: 1000,
            sleep: async (delay) => void delays.push(delay),
        })
        expect(delays).toEqual([1000, 2000, 50, 5000, 5000])
    })

    it("should fail with the last error after the last attempt", async () => {
        let calls = 0
        const result = await Retry.run(() => Retry.again(`busy ${calls++}`), { maxAttempts: 3, sleep })
        expect(result).toEqual(Err("busy 2"))
        expect(calls).toBe(3)
    })

    it("should fail with nothing when there is nothing to fail with", async () => {
        const result = await Retry.run(() => Retry.again(), { maxAttempts: 1 })
        expect(result).toEqual(Err())
    })

    it("should not try again once aborted", async () => {
        const controller = new AbortController()
        let calls = 0
        const result = await Retry.run(() => {
            if (++calls === 2) controller.abort()
            return Retry.again("busy")
        }, { signal: controller.signal, sleep })
        expect(result).toEqual(Err("busy"))
        expect(calls).toBe(2)
    })

    it("should always try once", async () => {
        const result = await Retry.run(() => Ok(1), { signal: AbortSignal.abort() })
        expect(result).toEqual(Ok(1))
    })

    it("should stop waiting when aborted", async () => {
        const controller = new AbortController()
        const start = performance.now()
        setTimeout(() => controller.abort(), 10)
        const result = await Retry.run(() => Retry.again("busy"), { minDelay: 60_000, signal: controller.signal })
        expect(result).toEqual(Err("busy"))
        expect(performance.now() - start).toBeLessThan(1000)
    })

    it("should wait with a timer by default", async () => {
        const start = performance.now()
        const result = await Retry.run((attempt) => attempt ? Ok(attempt) : Retry.again("busy"), { jitter: 0, minDelay: 20 })
        expect(result).toEqual(Ok(1))
        expect(performance.now() - start).toBeGreaterThanOrEqual(15)
    })

    it("should reject when waiting does", async () => {
        const run = Retry.run(() => Retry.again("busy"), { sleep: () => Promise.reject(new Error("broken")) })
        expect(run.promise).rejects.toThrow("broken")
    })

    it("should tell what it succeeds and fails with", async () => {
        const result = await Retry.run(async (attempt) => {
            if (attempt === 0) return Retry.again("unavailable")
            if (attempt === 1) return Err("failed")
            return Ok(attempt)
        }, { sleep })
        const typed: Result<number, "failed" | "unavailable"> = result
        expect(typed).toEqual(Err("failed"))
    })
})
