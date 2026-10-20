import { describe, expect, it } from "bun:test"
import { debounce } from "../../src/Function/debounce"

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe("Function.debounce", () => {
    it("should call with the last arguments once calls stop", async () => {
        const calls: number[] = []
        const fn = debounce((n: number) => void calls.push(n), { wait: 20 })
        fn(1)
        fn(2)
        fn(3)
        expect(calls).toEqual([])
        await sleep(60)
        expect(calls).toEqual([3])
    })

    it("should call immediately with leading", async () => {
        const calls: number[] = []
        const fn = debounce((n: number) => void calls.push(n), { leading: true, wait: 20 })
        fn(1)
        expect(calls).toEqual([1])
        fn(2)
        fn(3)
        expect(calls).toEqual([1])
        await sleep(60)
        expect(calls).toEqual([1, 3])
        fn(4)
        expect(calls).toEqual([1, 3, 4])
    })

    it("should only call on the leading edge without trailing", async () => {
        const calls: number[] = []
        const fn = debounce((n: number) => void calls.push(n), { leading: true, trailing: false, wait: 20 })
        fn(1)
        fn(2)
        await sleep(60)
        expect(calls).toEqual([1])
        fn(3)
        expect(calls).toEqual([1, 3])
    })

    it("should call after maxWait while calls keep coming", async () => {
        const calls: number[] = []
        const fn = debounce((n: number) => void calls.push(n), { maxWait: 50, wait: 30 })
        for (let i = 0; i < 8; i++) {
            fn(i)
            await sleep(10)
        }
        expect(calls.length).toBeGreaterThan(0)
    })

    it("should resolve idle when nothing has been called", async () => {
        const fn = debounce(() => {}, { wait: 20 })
        expect(fn.isIdle()).toBe(true)
        expect(await Promise.race([fn.idle().then(() => "idle"), sleep(50)])).toBe("idle")
    })

    it("should resolve idle after pending calls are done", async () => {
        const calls: number[] = []
        const fn = debounce((n: number) => void calls.push(n), { wait: 20 })
        fn(1)
        expect(fn.isPending()).toBe(true)
        await fn.idle()
        expect(calls).toEqual([1])
        expect(fn.isIdle()).toBe(true)
    })

    it("should flush and clear", async () => {
        const calls: number[] = []
        const fn = debounce((n: number) => void calls.push(n), { wait: 20 })
        fn(1)
        fn.flush()
        expect(calls).toEqual([1])
        fn(2)
        fn.clear()
        await sleep(60)
        expect(calls).toEqual([1])
    })

    it("should only flush the call that was pending when flushing", async () => {
        const calls: number[] = []
        const releases: (() => void)[] = []
        const fn = debounce(async (n: number) => {
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
        const fn = debounce(async (n: number) => {
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

    it("should not call twice in a row once maxWait forces a call with leading", async () => {
        const calls: number[] = []
        const times: number[] = []
        const fn = debounce((n: number) => {
            calls.push(n)
            times.push(performance.now())
        }, { leading: true, maxWait: 50, wait: 30 })
        for (let i = 0; i < 12; i++) {
            fn(i)
            await sleep(10)
        }
        await sleep(80)
        expect(calls[0]).toBe(0)
        expect(calls.at(-1)).toBe(11)
        expect(calls.length).toBeGreaterThan(2)
        expect(new Set(calls).size).toBe(calls.length)
        for (let i = 1; i < times.length; i++) expect(times[i]! - times[i - 1]!).toBeGreaterThan(15)
    })

    it("should only make leading calls without trailing, also with maxWait", async () => {
        let calling = false
        const calls: boolean[] = []
        const fn = debounce((_: number) => void calls.push(calling), { leading: true, maxWait: 50, trailing: false, wait: 30 })
        for (let i = 0; i < 12; i++) {
            calling = true
            fn(i)
            calling = false
            await sleep(10)
        }
        await sleep(80)
        expect(calls.length).toBeGreaterThan(1)
        expect(calls).toEqual(calls.map(() => true))
    })

    it("should only call when flushed without leading and trailing", async () => {
        const calls: number[] = []
        const fn = debounce((n: number) => void calls.push(n), { maxWait: 20, trailing: false, wait: 10 })
        fn(1)
        await sleep(15)
        fn(2)
        fn.flush()
        await sleep(40)
        expect(calls).toEqual([2])
        expect(fn.isIdle()).toBe(true)
    })

    it("should make a leading call that is due once what is running is done", async () => {
        const calls: number[] = []
        const fn = debounce(async (n: number) => {
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
        const fn = debounce(async (n: number) => {
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
})
