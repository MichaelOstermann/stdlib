import { describe, expect, it, vi } from "bun:test"
import { Disposer } from "../../src/Disposer"
import { Effect } from "../../src/Effect"
import { memo, signal } from "./helpers"

const watch = Effect.watch

describe("watch", () => {
    it("should call the computation with the next and previous value, but not initially", () => {
        const a = signal(1)
        const spy = vi.fn()
        watch(a, spy)
        expect(spy).toHaveBeenCalledTimes(0)

        a(2)
        expect(spy).toHaveBeenCalledWith(2, 1, expect.anything())

        a(3)
        expect(spy).toHaveBeenCalledWith(3, 2, expect.anything())
    })

    it("should accept memos and functions", () => {
        const a = signal(1)
        const fromMemo = vi.fn()
        const fromFunction = vi.fn()
        watch(memo(() => a() * 2), fromMemo)
        watch(() => a() * 3, fromFunction)

        a(2)
        expect(fromMemo).toHaveBeenCalledWith(4, 2, expect.anything())
        expect(fromFunction).toHaveBeenCalledWith(6, 3, expect.anything())
    })

    it("should only run when the dependencies changed their value", () => {
        const a = signal(1)
        const spy = vi.fn()
        watch(() => a() > 1, spy)

        a(2)
        a(3)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should use equals", () => {
        const a = signal({ id: 1 })
        const spy = vi.fn()
        watch(() => a(), spy, { equals: (before, after) => before.id === after.id })

        a({ id: 1 })
        expect(spy).toHaveBeenCalledTimes(0)
        a({ id: 2 })
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should not track what the computation reads", () => {
        const a = signal(1)
        const b = signal(1)
        const spy = vi.fn(() => void b())
        watch(a, spy)

        a(2)
        b(2)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should run cleanups before the next run and when disposed", () => {
        const a = signal(1)
        const returned = vi.fn()
        const watcher = watch(a, () => returned)

        a(2)
        a(3)
        expect(returned).toHaveBeenCalledTimes(1)

        watcher.dispose()
        expect(returned).toHaveBeenCalledTimes(2)

        a(4)
        expect(returned).toHaveBeenCalledTimes(2)
    })

    it("should be able to dispose itself", () => {
        const a = signal(1)
        const current: unknown[] = []
        const spy = vi.fn((_next: number, _prev: number, self: Effect) => {
            current.push(self)
            self.dispose()
        })
        const watcher = watch(a, spy)

        a(2)
        a(3)
        expect(current.length).toBe(1)
        expect(watcher.disposed).toBe(true)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(current[0]).toBe(watcher)
    })

    it("should not call the computation for the value it has when it is created", () => {
        const a = signal(1)
        const spy = vi.fn()
        watch(() => a() * 2, spy)
        a(1)
        expect(spy).toHaveBeenCalledTimes(0)
    })

    it("should stop with the disposer it has been added to", () => {
        const a = signal(1)
        const spy = vi.fn()
        const parent = Disposer()
        parent.onDispose(watch(a, spy))
        parent.dispose()
        a(2)
        expect(spy).toHaveBeenCalledTimes(0)
    })
})
