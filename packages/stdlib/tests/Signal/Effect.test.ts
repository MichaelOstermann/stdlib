import { describe, expect, it, vi } from "bun:test"
import { Disposer } from "../../src/Disposer"
import { Effect } from "../../src/Effect"
import { Emitter } from "../../src/Emitter"
import { currentEffect, deferEffect, disposeEffect, hasEffect, onCleanup, signal } from "./helpers"

const effect = Effect

describe("effect", () => {
    it("should unsubscribe from everything when disposed while running", () => {
        const onUnwatch = vi.fn()
        const a = signal(0, { onWatch: () => onUnwatch })
        const b = signal(0, { onWatch: () => onUnwatch })
        const spy = vi.fn(() => {
            if (a() + b() > 0) disposeEffect()
        })
        const fx = effect(spy)

        a(1)
        expect(fx.disposed).toBe(true)
        expect(onUnwatch).toHaveBeenCalledTimes(2)

        b(1)
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should unsubscribe from everything when disposed during the first run", () => {
        const onUnwatch = vi.fn()
        const a = signal(0, { onWatch: () => onUnwatch })
        const b = signal(0, { onWatch: () => onUnwatch })
        const spy = vi.fn(() => {
            a()
            disposeEffect()
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
        const registered = vi.fn()
        const fx = effect(() => {
            a()
            onCleanup(registered)
            return returned
        })

        a(1)
        expect(returned).toHaveBeenCalledTimes(1)
        expect(registered).toHaveBeenCalledTimes(1)

        fx.dispose()
        expect(returned).toHaveBeenCalledTimes(2)
        expect(registered).toHaveBeenCalledTimes(2)
    })

    it("should know the running effect", () => {
        expect(hasEffect()).toBe(false)
        expect(currentEffect()).toBe(undefined)

        const current: unknown[] = []
        const fx = effect(() => {
            expect(hasEffect()).toBe(true)
            current.push(currentEffect())
        })

        expect(current).toEqual([fx])
        expect(hasEffect()).toBe(false)
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
        expect(hasEffect()).toBe(false)
    })

    it("should restore the running effect when a cleanup throws", () => {
        const a = signal(0)
        effect(() => {
            a()
            return () => {
                throw new Error("fail")
            }
        })

        expect(() => a(1)).toThrow("fail")
        expect(hasEffect()).toBe(false)
        expect(onCleanup(() => {})).toBeFunction()
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
    it("should run cleanups of a run that threw when the effect is disposed", () => {
        const a = signal(0)
        const cleanup = vi.fn()
        const fx = effect(() => {
            onCleanup(cleanup)
            if (a() > 0) throw new Error("fail")
        })

        expect(() => a(1)).toThrow("fail")
        expect(cleanup).toHaveBeenCalledTimes(1)

        fx.dispose()
        expect(cleanup).toHaveBeenCalledTimes(2)
    })

    it("should run cleanups in reverse order", () => {
        const order: number[] = []
        const fx = effect(() => {
            onCleanup(() => order.push(1))
            onCleanup(() => order.push(2))
            return () => order.push(3)
        })

        fx.dispose()
        expect(order).toEqual([3, 2, 1])
    })
})

describe("Effect, as a disposer", () => {
    it("should stop when disposed, and with the disposer it has been added to", () => {
        const a = signal(0)
        const spy = vi.fn(() => void a())
        const parent = Disposer()
        const fx = parent.onDispose(effect(spy))
        const other = effect(spy)

        parent.dispose()
        expect(fx.disposed).toBe(true)
        other.dispose()
        other.dispose()

        a(1)
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should dispose what has been added to it before its cleanups", () => {
        const order: number[] = []
        const fx = effect(() => () => order.push(1))
        fx.onDispose(() => order.push(2))
        fx.dispose()
        expect(order).toEqual([2, 1])
    })

    it("should stop when dispose is passed as a callback", () => {
        const a = signal(0)
        const spy = vi.fn(() => void a())
        const onClose = Emitter<string>()
        onClose(effect(spy).dispose)
        onClose("now")
        a(1)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should reject what is deferred when it is disposed from the inside", async () => {
        const result = deferEffect(() => disposeEffect())
        expect(await result.then(() => "resolved", () => "rejected")).toBe("rejected")
    })

    it("should ignore cleanups when no effect is running", () => {
        const cb = vi.fn()
        expect(onCleanup(cb)).toBe(cb)
        expect(cb).toHaveBeenCalledTimes(0)
    })
})
