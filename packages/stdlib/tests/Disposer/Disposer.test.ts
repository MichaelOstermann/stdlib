import { describe, expect, expectTypeOf, it, vi } from "bun:test"
import { Disposer } from "../../src/Disposer"
import { Signal } from "../../src/Signal"
import { effect } from "../Signal/helpers"

function three(calls: number[], from: number): Disposer {
    return Disposer(() => calls.push(from), () => calls.push(from + 1), () => calls.push(from + 2))
}

describe("Disposer", () => {
    it("should dispose callbacks in reverse order, once", () => {
        const calls: number[] = []
        const dsp = Disposer()
        dsp.onDispose(() => calls.push(1))
        dsp.onDispose(() => calls.push(2))
        dsp.onDispose(() => calls.push(3))
        expect(dsp.disposed).toBe(false)
        dsp.dispose()
        dsp.dispose()
        expect(dsp.disposed).toBe(true)
        expect(calls).toEqual([3, 2, 1])
    })

    it("should take what to dispose when it is created", () => {
        const calls: number[] = []
        three(calls, 1).dispose()
        expect(calls).toEqual([3, 2, 1])
    })

    it("should return what is added, and ignore nothing", () => {
        const dsp = Disposer()
        const cb = (): void => {}
        expect(dsp.onDispose(cb)).toBe(cb)
        expect(dsp.onDispose(undefined)).toBe(undefined)
        expect(dsp.onDispose(false)).toBe(false)
        expect(dsp.onDispose(null)).toBe(null)
        dsp.dispose()
        expectTypeOf(dsp.onDispose(cb)).toEqualTypeOf<() => void>()
    })

    it("should dispose when dispose is passed as a callback", async () => {
        const cb = vi.fn()
        const dsp = Disposer(cb)
        const { dispose } = dsp
        ;[1].forEach(dispose as never)
        expect(dsp.disposed).toBe(true)
        expect(cb).toHaveBeenCalledTimes(1)

        const other = Disposer(cb)
        await Promise.resolve().finally(other.dispose)
        expect(other.disposed).toBe(true)
    })

    it("should dispose disposers, parents first", () => {
        const calls: number[] = []
        const dsp = three(calls, 1)
        const dsp1 = three(calls, 4)
        const dsp2 = three(calls, 7)
        const dsp3 = three(calls, 10)

        dsp.onDispose(dsp1)
        dsp.onDispose(dsp2)
        dsp.onDispose(dsp3)

        dsp.dispose()
        dsp.dispose()
        dsp1.dispose()
        dsp2.dispose()
        dsp3.dispose()

        expect(calls).toEqual([12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
    })

    it("should dispose disposers, children first", () => {
        const calls: number[] = []
        const dsp = three(calls, 1)
        const dsp1 = three(calls, 4)
        const dsp2 = three(calls, 7)
        const dsp3 = three(calls, 10)

        dsp.onDispose(dsp1)
        dsp.onDispose(dsp2)
        dsp.onDispose(dsp3)

        dsp2.dispose()
        dsp2.dispose()
        dsp3.dispose()
        dsp1.dispose()
        dsp.dispose()
        dsp.dispose()

        expect(calls).toEqual([9, 8, 7, 12, 11, 10, 6, 5, 4, 3, 2, 1])
    })

    it("should dispose nested disposers in between the values around them", () => {
        const order: number[] = []
        const a = Disposer()
        const b = Disposer()
        const c = Disposer()

        a.onDispose(() => order.push(1))
        a.onDispose(b)
        a.onDispose(() => order.push(4))
        b.onDispose(() => order.push(2))
        b.onDispose(c)
        c.onDispose(() => order.push(3))

        a.dispose()

        expect(order).toEqual([4, 3, 2, 1])
        expect([a.disposed, b.disposed, c.disposed]).toEqual([true, true, true])
    })

    it("should be removed from everything it has been added to once it is disposed", () => {
        const cb = vi.fn()
        const a = Disposer()
        const b = Disposer()
        const child = Disposer(cb)
        a.onDispose(child)
        b.onDispose(child)

        child.dispose()
        expect(cb).toHaveBeenCalledTimes(1)
        // Nothing is left that would keep it alive.
        expect((a as unknown as { vals: unknown }).vals).toBe(undefined)
        expect((b as unknown as { vals: unknown }).vals).toBe(undefined)

        a.dispose()
        b.dispose()
        expect(cb).toHaveBeenCalledTimes(1)
    })

    it("should dispose what is added after it has been disposed", () => {
        const dsp = Disposer()
        dsp.dispose()

        const cb = vi.fn()
        dsp.onDispose(cb)
        expect(cb).toHaveBeenCalledTimes(1)

        const disposable = { [Symbol.dispose]: vi.fn() }
        dsp.onDispose(disposable)
        expect(disposable[Symbol.dispose]).toHaveBeenCalledTimes(1)

        const child = Disposer(cb)
        dsp.onDispose(child)
        expect(child.disposed).toBe(true)
        expect(cb).toHaveBeenCalledTimes(2)
    })

    it("should ignore itself, and disposers that have been disposed", () => {
        const cb = vi.fn()
        const dsp = Disposer(cb)
        dsp.onDispose(dsp)
        const done = Disposer()
        done.dispose()
        dsp.onDispose(done)
        dsp.dispose()
        expect(cb).toHaveBeenCalledTimes(1)
    })

    it("should dispose disposables, and be one", () => {
        const cb = vi.fn()
        const inner = vi.fn()
        {
            using dsp = Disposer()
            dsp.onDispose(cb)
            dsp.onDispose({ [Symbol.dispose]: inner })
            expect(cb).toHaveBeenCalledTimes(0)
        }
        expect(cb).toHaveBeenCalledTimes(1)
        expect(inner).toHaveBeenCalledTimes(1)
    })

    it("should dispose everything when something throws", () => {
        const cb = vi.fn()
        const one = Disposer(cb, () => {
            throw new Error("a")
        }, cb)
        expect(() => one.dispose()).toThrow("a")
        expect(cb).toHaveBeenCalledTimes(2)
        expect(one.disposed).toBe(true)

        const several = Disposer(() => {
            throw new Error("a")
        }, Disposer(() => {
            throw new Error("b")
        }))
        let error: unknown
        try { several.dispose() }
        catch (e) { error = e }
        expect(error).toBeInstanceOf(AggregateError)
        expect((error as AggregateError).errors.map(String)).toEqual(["Error: b", "Error: a"])
    })

    it("should dispose what is added while disposing", () => {
        const calls: number[] = []
        const dsp = Disposer()
        dsp.onDispose(() => {
            calls.push(1)
            dsp.onDispose(() => calls.push(2))
        })
        dsp.dispose()
        expect(calls).toEqual([1, 2])
    })

    it("should batch and untrack while disposing", () => {
        const $a = Signal(0)
        const $b = Signal(0)
        const seen: number[][] = []
        effect(() => void seen.push([$a(), $b()]))

        const dsp = Disposer(() => $a(1), () => $b(1))
        const outer = vi.fn(() => {
            if (!dsp.disposed) dsp.onDispose(() => void $a())
            dsp.dispose()
        })
        effect(outer)

        expect(seen).toEqual([[0, 0], [1, 1]])
        $a(2)
        expect(outer).toHaveBeenCalledTimes(1)
    })

    it("should untrack what is disposed right away", () => {
        const $a = Signal(0)
        const dsp = Disposer()
        dsp.dispose()
        const outer = vi.fn(() => void dsp.onDispose(() => void $a()))
        effect(outer)
        $a(1)
        expect(outer).toHaveBeenCalledTimes(1)
    })
})

describe("Disposer.is", () => {
    it("should tell disposers from everything else", () => {
        expect(Disposer.is(Disposer())).toBe(true)
        for (const value of [null, undefined, 1, "string", {}, [], () => {}]) expect(Disposer.is(value)).toBe(false)
    })

    it("should recognize disposers of other copies of this package", () => {
        expect(Disposer.is({ [Symbol.for("@monstermann/stdlib/Disposer")]: true })).toBe(true)
    })
})
