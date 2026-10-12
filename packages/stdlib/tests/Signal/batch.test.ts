import { describe, expect, it, vi } from "bun:test"
import { batch, effect, memo, signal, untrack } from "./helpers"

describe("batch", () => {
    it("should not rerun effects when a signal is back to its value", () => {
        const a = signal(1)
        const spy = vi.fn(() => void a())
        effect(spy)

        batch(() => {
            a(2)
            a(1)
        })
        expect(spy).toHaveBeenCalledTimes(1)

        batch(() => {
            a(2)
            a(3)
        })
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should not recompute memos when a signal is back to its value", () => {
        const a = signal(1)
        const compute = vi.fn(() => a() * 2)
        const m = memo(compute)
        const spy = vi.fn(() => void m())
        effect(spy)

        batch(() => {
            a(2)
            a(1)
        })

        expect(compute).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should rerun when another signal did change", () => {
        const a = signal(1)
        const b = signal(1)
        const spy = vi.fn(() => void (a() + b()))
        effect(spy)

        batch(() => {
            a(2)
            b(2)
            a(1)
        })

        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should not return stale values from memos that have been read in between", () => {
        const a = signal(1)
        const m = memo(() => a() * 2)

        batch(() => {
            a(2)
            expect(m()).toBe(4)
            a(1)
        })
        expect(m()).toBe(2)

        a(2)
        expect(m()).toBe(4)
    })

    it("should handle writes to the same signal in nested batches", () => {
        const a = signal(1)
        const spy = vi.fn(() => void a())
        effect(spy)

        batch(() => {
            a(2)
            batch(() => a(3))
            a(1)
        })

        expect(spy).toHaveBeenCalledTimes(1)
        a(2)
        expect(spy).toHaveBeenCalledTimes(2)
    })
})

describe("repeated writes", () => {
    it("should notify again after a memo has been read in between", () => {
        const a = signal(0)
        const m = memo(() => a() * 2)
        const seen: number[] = []
        effect(() => void seen.push(m()))

        batch(() => {
            a(1)
            expect(m()).toBe(2)
            a(2)
            expect(m()).toBe(4)
            a(3)
        })

        expect(seen).toEqual([0, 6])
        expect(m()).toBe(6)
    })

    it("should notify what subscribed in between", () => {
        const a = signal(0)
        const first: number[] = []
        const second: number[] = []
        effect(() => void first.push(a()))

        batch(() => {
            a(1)
            effect(() => void second.push(a()))
            a(2)
            const m = memo(() => a() * 2)
            effect(() => void second.push(m()))
            a(3)
        })

        expect(first).toEqual([0, 3])
        expect(second).toEqual([1, 4, 6, 3])
    })

    it("should notify again in the next batch and outside of batches", () => {
        const a = signal(0)
        const m = memo(() => a() * 2)
        const spy = vi.fn(() => void m())
        effect(spy)

        batch(() => {
            a(1)
            a(2)
        })
        batch(() => {
            a(3)
            a(4)
        })
        a(5)
        a(6)

        expect(spy).toHaveBeenCalledTimes(5)
    })

    it("should keep untracked memos up to date", () => {
        const a = signal(0)
        const m = memo(() => a() * 2)

        a(1)
        a(2)
        expect(m()).toBe(4)
        a(3)
        a(4)
        expect(m()).toBe(8)
    })

    it("should notify an effect again that already ran in the same flush", () => {
        const trigger = signal(0)
        const value = signal(0)
        const seen: number[] = []

        effect(() => {
            if (trigger()) value(1)
        })
        effect(() => {
            trigger()
            seen.push(value())
        })
        effect(() => {
            if (trigger()) value(2)
        })

        trigger(1)

        expect(value()).toBe(2)
        expect(seen).toEqual([0, 1, 2])
    })

    it("should notify effects that write during the flush", () => {
        const a = signal(0)
        const b = signal(0)
        const seen: number[] = []
        effect(() => {
            if (a() < 3) a(a() + 1)
        })
        effect(() => void seen.push(a() + b()))

        batch(() => {
            b(1)
            b(2)
        })

        expect(a()).toBe(3)
        expect(seen.at(-1)).toBe(5)
    })
})

describe("untrack", () => {
    it("should not track inside effects", () => {
        const a = signal(0)
        const b = signal(0)
        const spy = vi.fn(() => void (a() + untrack(() => untrack(b))))
        effect(spy)

        b(1)
        expect(spy).toHaveBeenCalledTimes(1)
        a(1)
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should resume tracking afterwards, also when throwing", () => {
        const a = signal(0)
        const spy = vi.fn(() => {
            try {
                untrack(() => {
                    throw new Error("fail")
                })
            }
            catch {}
            a()
        })
        effect(spy)

        a(1)
        expect(spy).toHaveBeenCalledTimes(2)
    })
})
