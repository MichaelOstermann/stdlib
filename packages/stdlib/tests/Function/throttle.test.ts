import { describe, expect, it } from "bun:test"
import { throttle } from "../../src/Function/throttle"

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe("Function.throttle", () => {
    it("should call at most once per wait with the last arguments", async () => {
        const calls: number[] = []
        const fn = throttle((n: number) => void calls.push(n), { wait: 30 })
        fn(1)
        fn(2)
        expect(calls).toEqual([])
        await sleep(60)
        expect(calls).toEqual([2])
    })

    it("should call immediately with leading", async () => {
        const calls: number[] = []
        const fn = throttle((n: number) => void calls.push(n), { leading: true, wait: 40 })
        fn(1)
        expect(calls).toEqual([1])
        fn(2)
        fn(3)
        expect(calls).toEqual([1])
        await sleep(60)
        expect(calls).toEqual([1, 3])
    })

    it("should not call twice in a row after a trailing call", async () => {
        const calls: number[] = []
        const fn = throttle((n: number) => void calls.push(n), { leading: true, wait: 40 })
        fn(1)
        fn(2)
        await sleep(50)
        expect(calls).toEqual([1, 2])
        fn(3)
        expect(calls).toEqual([1, 2])
        await sleep(60)
        expect(calls).toEqual([1, 2, 3])
        await sleep(50)
        fn(4)
        expect(calls).toEqual([1, 2, 3, 4])
    })

    it("should drop calls within the wait time without trailing", async () => {
        const calls: number[] = []
        const fn = throttle((n: number) => void calls.push(n), { leading: true, trailing: false, wait: 30 })
        fn(1)
        fn(2)
        await sleep(60)
        expect(calls).toEqual([1])
    })

    it("should resolve idle when nothing has been called", async () => {
        const fn = throttle(() => {}, { wait: 20 })
        expect(await Promise.race([fn.idle().then(() => "idle"), sleep(50)])).toBe("idle")
    })

    it("should only flush the call that was pending when flushing", async () => {
        const calls: number[] = []
        const releases: (() => void)[] = []
        const fn = throttle(async (n: number) => {
            calls.push(n)
            await new Promise<void>((resolve) => releases.push(resolve))
        }, { wait: 30 })

        fn(1)
        fn.flush()
        fn(2)
        fn.flush()
        releases.shift()!()
        await sleep(1)
        expect(calls).toEqual([1, 2])

        // Not flushed, this one has to wait again.
        fn(3)
        releases.shift()!()
        await sleep(1)
        expect(calls).toEqual([1, 2])

        await sleep(60)
        expect(calls).toEqual([1, 2, 3])
        releases.shift()!()
        await fn.idle()
    })

    it("should forget about a flush when cleared", async () => {
        const calls: number[] = []
        const releases: (() => void)[] = []
        const fn = throttle(async (n: number) => {
            calls.push(n)
            await new Promise<void>((resolve) => releases.push(resolve))
        }, { wait: 30 })

        fn(1)
        fn.flush()
        fn(2)
        fn.flush()
        fn.clear()
        fn(3)
        releases.shift()!()
        await sleep(1)
        expect(calls).toEqual([1])

        await sleep(60)
        expect(calls).toEqual([1, 3])
        releases.shift()!()
        await fn.idle()
    })

    it("should make a leading call that is due once what is running is done", async () => {
        const calls: number[] = []
        const fn = throttle(async (n: number) => {
            calls.push(n)
            await sleep(50)
        }, { leading: true, trailing: false, wait: 20 })
        fn(1)
        await sleep(30)
        fn(2)
        expect(calls).toEqual([1])
        await sleep(40)
        expect(calls).toEqual([1, 2])
        await fn.idle()
    })

    it("should drop calls within the wait time while running without trailing", async () => {
        const calls: number[] = []
        const fn = throttle(async (n: number) => {
            calls.push(n)
            await sleep(50)
        }, { leading: true, trailing: false, wait: 20 })
        fn(1)
        await sleep(5)
        fn(2)
        await sleep(100)
        expect(calls).toEqual([1])
        expect(fn.isIdle()).toBe(true)
    })

    it("should make a trailing call that is overdue once what is running is done", async () => {
        const calls: number[] = []
        const fn = throttle(async (n: number) => {
            calls.push(n)
            await sleep(50)
        }, { leading: true, wait: 20 })
        fn(1)
        await sleep(5)
        fn(2)
        await sleep(55)
        expect(calls).toEqual([1, 2])
        await fn.idle()
    })

    it("should never call without leading and trailing", async () => {
        const calls: number[] = []
        const fn = throttle((n: number) => void calls.push(n), { trailing: false, wait: 10 })
        fn(1)
        await sleep(30)
        fn(2)
        await sleep(30)
        expect(calls).toEqual([])
        expect(fn.isIdle()).toBe(true)
    })
})
