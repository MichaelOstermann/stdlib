import { describe, expect, it, vi } from "bun:test"
import { Effect } from "../../src/Effect"
import { deferEffect, signal } from "./helpers"

const effect = Effect

describe("effect", () => {
    it("should unsubscribe from everything when disposed while running", () => {
        const onUnwatch = vi.fn()
        const a = signal(0, { onWatch: () => onUnwatch })
        const b = signal(0, { onWatch: () => onUnwatch })
        const spy = vi.fn((fx: Effect) => {
            if (a() + b() > 0) fx.dispose()
        })
        effect(spy)

        a(1)
        expect(onUnwatch).toHaveBeenCalledTimes(2)

        b(1)
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should unsubscribe from everything when disposed during the first run", () => {
        const onUnwatch = vi.fn()
        const a = signal(0, { onWatch: () => onUnwatch })
        const b = signal(0, { onWatch: () => onUnwatch })
        const spy = vi.fn((fx: Effect) => {
            a()
            fx.dispose()
            b()
        })
        effect(spy)

        expect(onUnwatch).toHaveBeenCalledTimes(2)
        a(1)
        b(1)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should run cleanups before the next run and when disposed", () => {
        const a = signal(0)
        const returned = vi.fn()
        const fx = effect(() => {
            a()
            return returned
        })

        a(1)
        expect(returned).toHaveBeenCalledTimes(1)

        fx.dispose()
        fx.dispose()
        expect(returned).toHaveBeenCalledTimes(2)
    })

    it("should be called with itself", () => {
        const a = signal(0)
        const seen: unknown[] = []
        const fx = effect((self) => {
            a()
            seen.push(self)
        })
        a(1)
        expect(seen).toEqual([fx, fx])
        expect(seen[0]).toBe(fx)
    })

    it("should rethrow what the computation throws", () => {
        const promise = Promise.resolve()
        let thrown
        try {
            effect(() => {
                throw promise
            })
        }
        catch (error) {
            thrown = error
        }
        expect(thrown).toBe(promise)
    })

    it("should throw what a cleanup throws", () => {
        const a = signal(0)
        effect(() => {
            a()
            return () => {
                throw new Error("fail")
            }
        })

        expect(() => a(1)).toThrow("fail")
    })
})

describe("deferEffect", () => {
    it("should resolve and dispose", async () => {
        const a = signal(0)
        const spy = vi.fn()
        const result = deferEffect<number>((resolve) => {
            spy()
            if (a() > 1) resolve(a())
        })

        a(1)
        a(2)
        expect(await result).toBe(2)

        a(3)
        expect(spy).toHaveBeenCalledTimes(3)
    })
})

describe("cleanups", () => {
    it("should clean up once, also when the cleanup throws", () => {
        const a = signal(0)
        const cleanup = vi.fn(() => {
            throw new Error("fail")
        })
        const fx = effect(() => {
            a()
            return a() === 0 ? cleanup : undefined
        })

        expect(() => a(1)).toThrow("fail")
        fx.dispose()
        expect(cleanup).toHaveBeenCalledTimes(1)
    })

    it("should clean up when it is disposed while it runs", () => {
        const cleanup = vi.fn()
        effect((fx) => {
            fx.dispose()
            return cleanup
        })
        expect(cleanup).toHaveBeenCalledTimes(1)
    })

    it("should not depend on what a cleanup reads", () => {
        const a = signal(0)
        const b = signal(0)
        const spy = vi.fn(() => {
            a()
            return () => void b()
        })
        effect(spy)
        a(1)
        b(1)
        expect(spy).toHaveBeenCalledTimes(2)
    })
})

describe("Effect, disposed", () => {
    it("should stop when disposed, also twice", () => {
        const a = signal(0)
        const spy = vi.fn(() => void a())
        const fx = effect(spy)
        fx.dispose()
        fx.dispose()

        a(1)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should reject what is deferred when it is disposed from the inside", async () => {
        const result = deferEffect((_resolve, _reject, fx) => fx.dispose())
        expect(await result.then(() => "resolved", () => "rejected")).toBe("rejected")
    })
})
