import type { Result } from "../src/Result"
import { describe, expect, it } from "bun:test"
import { Semaphore, SemaphoreFullError } from "../src/Semaphore"

/** A function that runs until it is told to finish. */
function task<T>(log: string[], name: string, value: T): { finish: () => void, run: () => Promise<T> } {
    const { promise, resolve } = Promise.withResolvers<void>()
    return {
        finish: resolve,
        run: async () => {
            log.push(`start ${name}`)
            await promise
            log.push(`end ${name}`)
            return value
        },
    }
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0))

describe("Semaphore", () => {
    it("should run as many at the same time as asked for, the others in order", async () => {
        const log: string[] = []
        const semaphore = Semaphore({ concurrency: 2 })
        const [a, b, c, d] = ["a", "b", "c", "d"].map((name) => task(log, name, name)) as [ReturnType<typeof task<string>>, ReturnType<typeof task<string>>, ReturnType<typeof task<string>>, ReturnType<typeof task<string>>]
        const results = Promise.all([a, b, c, d].map((it) => semaphore.run(it.run)))

        expect(log).toEqual(["start a", "start b"])
        expect(semaphore.size).toBe(4)

        b.finish()
        await tick()
        expect(log).toEqual(["start a", "start b", "end b", "start c"])

        a.finish()
        c.finish()
        d.finish()
        expect(await results).toEqual(["a", "b", "c", "d"])
        expect(semaphore.size).toBe(0)
    })

    it("should return what the function returns, and reject with what it throws", async () => {
        const semaphore = Semaphore({ concurrency: 1 })
        expect(await semaphore.run(() => 1)).toBe(1)
        expect(await semaphore.run(async () => 2)).toBe(2)
        expect(semaphore.run(() => {
            throw new Error("sync")
        })).rejects.toThrow("sync")
        expect(semaphore.run(() => Promise.reject(new Error("async")))).rejects.toThrow("async")
        // A function that failed gives its turn to the next one.
        expect(await semaphore.run(() => 3)).toBe(3)
        expect(semaphore.size).toBe(0)
    })

    it("should limit each key on its own", async () => {
        const log: string[] = []
        const lock = Semaphore({ concurrency: 1 })
        const a1 = task(log, "a1", 1)
        const a2 = task(log, "a2", 2)
        const b1 = task(log, "b1", 3)
        const free = task(log, "free", 4)
        const results = Promise.all([lock.run("a", a1.run), lock.run("a", a2.run), lock.run("b", b1.run), lock.run(free.run)])

        expect(log).toEqual(["start a1", "start b1", "start free"])
        a1.finish()
        await tick()
        expect(log).toEqual(["start a1", "start b1", "start free", "end a1", "start a2"])

        a2.finish()
        b1.finish()
        free.finish()
        expect(await results).toEqual([1, 2, 3, 4])
    })

    it("should take every kind of key, and forget keys that are done", async () => {
        const lock = Semaphore({ concurrency: 1 })
        const symbol = Symbol("key")
        expect(await Promise.all([lock.run(symbol, () => 1), lock.run(0, () => 2), lock.run("", () => 3), lock.run("0", () => 4)])).toEqual([1, 2, 3, 4])
        expect(lock.size).toBe(0)
    })

    it("should fail instead of letting too many wait", async () => {
        const log: string[] = []
        const semaphore = Semaphore({ concurrency: 1, maxWaiting: 1 })
        const a = task(log, "a", 1)
        const b = task(log, "b", 2)
        const first = semaphore.run(a.run)
        const second = semaphore.run(b.run)
        const third = await semaphore.run(() => 3)

        const typed: Result<number, SemaphoreFullError> = third
        expect(typed.ok).toBe(false)
        expect(typed.value).toBeInstanceOf(SemaphoreFullError)
        expect(semaphore.size).toBe(2)

        a.finish()
        b.finish()
        expect((await first).unwrap()).toBe(1)
        expect((await second).unwrap()).toBe(2)
        // There is room again.
        expect((await semaphore.run(() => 4)).unwrap()).toBe(4)
    })

    it("should let nothing wait with a maxWaiting of 0, by key", async () => {
        const log: string[] = []
        const semaphore = Semaphore({ concurrency: 1, maxWaiting: 0 })
        const a = task(log, "a", 1)
        const first = semaphore.run("a", a.run)
        expect((await semaphore.run("a", () => 2)).ok).toBe(false)
        expect((await semaphore.run("b", () => 3)).unwrap()).toBe(3)
        a.finish()
        expect((await first).unwrap()).toBe(1)
    })

    it("should reject with what the function throws when there is a limit", async () => {
        const semaphore = Semaphore({ concurrency: 1, maxWaiting: 1 })
        expect(semaphore.run(() => Promise.reject(new Error("failed"))).promise).rejects.toThrow("failed")
        await tick()
        expect(semaphore.size).toBe(0)
    })

    it("should tell when nothing is running or waiting", async () => {
        const log: string[] = []
        const semaphore = Semaphore({ concurrency: 1 })
        await semaphore.idle()

        const a = task(log, "a", 1)
        const b = task(log, "b", 2)
        void semaphore.run(a.run)
        void semaphore.run("key", b.run)
        void semaphore.idle().then(() => log.push("idle"))

        a.finish()
        await tick()
        expect(log).not.toContain("idle")
        b.finish()
        await tick()
        expect(log.at(-1)).toBe("idle")
    })

    it("should ask for a concurrency that lets something run", () => {
        expect(() => Semaphore({ concurrency: 0 })).toThrow(RangeError)
        expect(() => Semaphore({ concurrency: Number.NaN })).toThrow(RangeError)
    })
})
