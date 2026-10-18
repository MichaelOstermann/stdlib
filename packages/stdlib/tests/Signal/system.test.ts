import { describe, expect, it, vi } from "bun:test"
import { batch, disposeEffect, effect, memo, peek, signal, untrack } from "./helpers"

describe("signal", () => {
    it("should return value", () => {
        const v = [1, 2]
        const s = signal(v)
        expect(s()).toEqual(v)
    })

    it("should notify other listeners of changes after one listener is disposed", () => {
        const s = signal(0)
        const spy1 = vi.fn(() => {
            s()
        })
        const spy2 = vi.fn(() => {
            s()
        })
        const spy3 = vi.fn(() => {
            s()
        })

        effect(spy1)
        const dispose = effect(spy2)
        effect(spy3)

        expect(spy1).toHaveBeenCalledTimes(1)
        expect(spy2).toHaveBeenCalledTimes(1)
        expect(spy3).toHaveBeenCalledTimes(1)

        dispose()

        s(1)
        expect(spy1).toHaveBeenCalledTimes(2)
        expect(spy2).toHaveBeenCalledTimes(1)
        expect(spy3).toHaveBeenCalledTimes(2)
    })

    describe(".peek()", () => {
        it("should get value", () => {
            const s = signal(1)
            expect(peek(s)).toBe(1)
        })

        it("should get the updated value after a value change", () => {
            const s = signal(1)
            s(2)
            expect(peek(s)).toBe(2)
        })

        it("should not make surrounding effect depend on the signal", () => {
            const s = signal(1)
            const spy = vi.fn(() => {
                peek(s)
            })

            effect(spy)
            expect(spy).toHaveBeenCalledTimes(1)

            s(2)
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it("should not make surrounding memo depend on the signal", () => {
            const s = signal(1)
            const spy = vi.fn(() => {
                peek(s)
            })
            const d = memo(spy)

            d()
            expect(spy).toHaveBeenCalledTimes(1)

            s(2)
            d()
            expect(spy).toHaveBeenCalledTimes(1)
        })
    })
})

describe("effect()", () => {
    it("should run the callback immediately", () => {
        const s = signal(123)
        const spy = vi.fn(() => {
            s()
        })
        effect(spy)
        expect(spy).toHaveBeenCalled()
    })

    it("should subscribe to signals", () => {
        const s = signal(123)
        const spy = vi.fn(() => {
            s()
        })
        effect(spy)
        spy.mockClear()

        s(42)
        expect(spy).toHaveBeenCalled()
    })

    it("should subscribe to multiple signals", () => {
        const a = signal("a")
        const b = signal("b")
        const spy = vi.fn(() => {
            a()
            b()
        })
        effect(spy)
        spy.mockClear()

        a("aa")
        b("bb")
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should dispose of subscriptions", () => {
        const a = signal("a")
        const b = signal("b")
        const spy = vi.fn(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            `${a()} ${b()}`
        })
        const dispose = effect(spy)
        spy.mockClear()

        dispose()
        expect(spy).not.toHaveBeenCalled()

        a("aa")
        b("bb")
        expect(spy).not.toHaveBeenCalled()
    })

    it("should dispose of subscriptions", () => {
        const a = signal("a")
        const b = signal("b")
        const spy = vi.fn(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            `${a()} ${b()}`
        })
        effect(() => {
            spy()
            if (a() === "aa") {
                disposeEffect()
            }
        })

        expect(spy).toHaveBeenCalled()

        a("aa")
        expect(spy).toHaveBeenCalledTimes(2)

        a("aaa")
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should dispose of subscriptions immediately", () => {
        const a = signal("a")
        const b = signal("b")
        const spy = vi.fn(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            `${a()} ${b()}`
        })
        effect(() => {
            spy()
            disposeEffect()
        })

        expect(spy).toHaveBeenCalledTimes(1)

        a("aa")
        expect(spy).toHaveBeenCalledTimes(1)

        a("aaa")
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should dispose of subscriptions when called twice", () => {
        const a = signal("a")
        const b = signal("b")
        const spy = vi.fn(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            `${a()} ${b()}`
        })
        const dispose = effect(() => {
            spy()
            if (a() === "aa") {
                disposeEffect()
            }
        })

        expect(spy).toHaveBeenCalled()

        a("aa")
        expect(spy).toHaveBeenCalledTimes(2)
        dispose()

        a("aaa")
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should dispose of subscriptions immediately and signals are read after disposing", () => {
        const a = signal("a")
        const b = signal("b")
        const spy = vi.fn(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            `${a()} ${b()}`
        })
        effect(() => {
            disposeEffect()
            spy()
        })

        expect(spy).toHaveBeenCalledTimes(1)

        a("aa")
        expect(spy).toHaveBeenCalledTimes(1)

        a("aaa")
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should dispose of subscriptions immediately when called twice (deferred)", () => {
        const a = signal("a")
        const b = signal("b")
        const spy = vi.fn(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            `${a()} ${b()}`
        })
        const dispose = effect(() => {
            spy()
            disposeEffect()
        })

        expect(spy).toHaveBeenCalledTimes(1)

        a("aa")
        expect(spy).toHaveBeenCalledTimes(1)
        dispose()

        a("aaa")
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should unsubscribe from signal", () => {
        const s = signal(123)
        const spy = vi.fn(() => {
            s()
        })
        const unsub = effect(spy)
        spy.mockClear()

        unsub()
        s(42)
        expect(spy).not.toHaveBeenCalled()
    })

    it("should conditionally unsubscribe from signals", () => {
        const a = signal("a")
        const b = signal("b")
        const cond = signal(true)

        const spy = vi.fn(() => {
            cond() ? a() : b()
        })

        effect(spy)
        expect(spy).toHaveBeenCalledTimes(1)

        b("bb")
        expect(spy).toHaveBeenCalledTimes(1)

        cond(false)
        expect(spy).toHaveBeenCalledTimes(2)

        spy.mockClear()

        a("aaa")
        expect(spy).not.toHaveBeenCalled()
    })

    it("should batch writes", () => {
        const a = signal("a")
        const spy = vi.fn(() => {
            a()
        })
        effect(spy)
        spy.mockClear()

        effect(() => {
            a("aa")
            a("aaa")
        })

        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should run what an effect notifies once that effect is done", () => {
        const a = signal(0)
        const log: string[] = []
        effect(() => {
            log.push(`read ${a()}`)
        })
        log.length = 0

        effect(() => {
            a(1)
            log.push("wrote")
            batch(() => a(2))
            log.push("wrote in batch")
        })

        expect(log).toEqual(["wrote", "wrote in batch", "read 2"])
    })

    it("should call the cleanup callback before the next run", () => {
        const a = signal(0)
        const spy = vi.fn()

        effect(() => {
            a()
            return spy
        })
        expect(spy).not.toHaveBeenCalled()
        a(1)
        expect(spy).toHaveBeenCalledTimes(1)
        a(2)
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should call only the callback from the previous run", () => {
        const spy1 = vi.fn()
        const spy2 = vi.fn()
        const spy3 = vi.fn()
        const a = signal(spy1)

        effect(() => {
            return a()
        })

        expect(spy1).not.toHaveBeenCalled()
        expect(spy2).not.toHaveBeenCalled()
        expect(spy3).not.toHaveBeenCalled()

        a(() => spy2)
        expect(spy1).toHaveBeenCalledTimes(1)
        expect(spy2).not.toHaveBeenCalled()
        expect(spy3).not.toHaveBeenCalled()

        a(() => spy3)
        expect(spy1).toHaveBeenCalledTimes(1)
        expect(spy2).toHaveBeenCalledTimes(1)
        expect(spy3).not.toHaveBeenCalled()
    })

    it("should call the cleanup callback function when disposed", () => {
        const spy = vi.fn()

        const dispose = effect(() => {
            return spy
        })
        expect(spy).not.toHaveBeenCalled()
        dispose()
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should not recompute if the effect has been notified about changes, but no direct dependency has actually changed", () => {
        const s = signal(0)
        const c = memo(() => {
            s()
            return 0
        })
        const spy = vi.fn(() => {
            c()
        })
        effect(spy)
        expect(spy).toHaveBeenCalledTimes(1)
        spy.mockClear()

        s(1)
        expect(spy).not.toHaveBeenCalled()
    })

    it("should not recompute dependencies unnecessarily", () => {
        const spy = vi.fn()
        const a = signal(0)
        const b = signal(0)
        const c = memo(() => {
            b()
            spy()
        })
        effect(() => {
            if (a() === 0) {
                c()
            }
        })
        expect(spy).toHaveBeenCalledTimes(1)

        batch(() => {
            b(1)
            a(1)
        })
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should not recompute dependencies out of order", () => {
        const a = signal(1)
        const b = signal(1)
        const c = signal(1)

        const spy = vi.fn(() => c())
        const d = memo(spy)

        effect(() => {
            if (a() > 0) {
                b()
                d()
            }
            else {
                b()
            }
        })
        spy.mockClear()

        batch(() => {
            a(2)
            b(2)
            c(2)
        })
        expect(spy).toHaveBeenCalledTimes(1)
        spy.mockClear()

        batch(() => {
            a(-1)
            b(-1)
            c(-1)
        })
        expect(spy).not.toHaveBeenCalled()
        spy.mockClear()
    })

    it("should recompute if a dependency changes during computation after becoming a dependency", () => {
        const a = signal(0)
        const spy = vi.fn(() => {
            if (a() === 0) {
                a(v => v + 1)
            }
        })
        effect(spy)
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should run the cleanup in an implicit batch", () => {
        const a = signal(0)
        const b = signal("a")
        const c = signal("b")
        const spy = vi.fn()

        effect(() => {
            b()
            c()
            spy(b() + c())
        })

        effect(() => {
            a()
            return () => {
                b("x")
                c("y")
            }
        })

        expect(spy).toHaveBeenCalledTimes(1)
        spy.mockClear()

        a(1)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith("xy")
    })

    it("should not retrigger the effect if the cleanup modifies one of the dependencies", () => {
        const a = signal(0)
        const spy = vi.fn()

        effect(() => {
            spy(a())
            return () => {
                a(2)
            }
        })
        expect(spy).toHaveBeenCalledTimes(1)
        spy.mockClear()

        a(1)
        expect(spy).toHaveBeenCalledTimes(1)
        expect(spy).toHaveBeenCalledWith(2)
    })

    it("should run the cleanup if the effect disposes itself", () => {
        const a = signal(0)
        const spy = vi.fn()

        const dispose = effect(() => {
            if (a() > 0) {
                dispose()
                return spy
            }
            return undefined
        })
        expect(spy).not.toHaveBeenCalled()
        a(1)
        expect(spy).toHaveBeenCalledTimes(1)
        a(2)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should not run the effect if the cleanup function disposes it", () => {
        const a = signal(0)
        const spy = vi.fn()

        const dispose = effect(() => {
            a()
            spy()
            return () => {
                dispose()
            }
        })
        expect(spy).toHaveBeenCalledTimes(1)
        a(1)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should reset the cleanup if the effect throws", () => {
        const a = signal(0)
        const spy = vi.fn()

        effect(() => {
            if (a() === 0) {
                return spy
            }
            else {
                throw new Error("hello")
            }
        })
        expect(spy).not.toHaveBeenCalled()
        expect(() => a(1)).toThrow("hello")
        expect(spy).toHaveBeenCalledTimes(1)
        a(0)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should dispose the effect if the cleanup callback throws", () => {
        const a = signal(0)
        const spy = vi.fn()

        effect(() => {
            if (a() === 0) {
                return () => {
                    throw new Error("hello")
                }
            }
            else {
                spy()
            }
            return undefined
        })
        expect(spy).not.toHaveBeenCalled()
        expect(() => a(v => v + 1)).toThrow("hello")
        expect(spy).not.toHaveBeenCalled()
        a(v => v + 1)
        expect(spy).not.toHaveBeenCalled()
    })

    it("should run cleanups outside any evaluation context", () => {
        const spy = vi.fn()
        const a = signal(0)
        const b = signal(0)
        const c = memo(() => {
            if (a() === 0) {
                effect(() => {
                    return () => {
                        b()
                    }
                })
            }
            return a()
        })

        effect(() => {
            spy()
            c()
        })
        expect(spy).toHaveBeenCalledTimes(1)
        spy.mockClear()

        a(1)
        expect(spy).toHaveBeenCalledTimes(1)
        spy.mockClear()

        b(1)
        expect(spy).not.toHaveBeenCalled()
    })

    it("should throw on cycles", () => {
        const a = signal(0)
        let i = 0

        const fn = () =>
            effect(() => {
                // Prevent test suite from spinning if limit is not hit
                if (i++ > 200) {
                    throw new Error("test failed")
                }
                a()
                a(Number.NaN)
            })

        expect(fn).toThrow(/Cycle detected/)
    })

    it("should throw on indirect cycles", () => {
        const a = signal(0)
        let i = 0

        const c = memo(() => {
            a()
            a(Number.NaN)
            return Number.NaN
        })

        const fn = () =>
            effect(() => {
                // Prevent test suite from spinning if limit is not hit
                if (i++ > 200) {
                    throw new Error("test failed")
                }
                c()
            })

        expect(fn).toThrow(/Cycle detected/)
    })

    it("should allow disposing the effect multiple times", () => {
        const dispose = effect(() => undefined)
        dispose()
        expect(() => dispose()).not.toThrow()
    })

    it("should allow disposing a running effect", () => {
        const a = signal(0)
        const spy = vi.fn()
        const dispose = effect(() => {
            if (a() === 1) {
                dispose()
                spy()
            }
        })
        expect(spy).not.toHaveBeenCalled()
        a(1)
        expect(spy).toHaveBeenCalledTimes(1)
        a(2)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should not run if it's first been triggered and then disposed in a batch", () => {
        const a = signal(0)
        const spy = vi.fn(() => {
            a()
        })
        const dispose = effect(spy)
        spy.mockClear()

        batch(() => {
            a(1)
            dispose()
        })

        expect(spy).not.toHaveBeenCalled()
    })

    it("should not run if it's been triggered, disposed and then triggered again in a batch", () => {
        const a = signal(0)
        const spy = vi.fn(() => {
            a()
        })
        const dispose = effect(spy)
        spy.mockClear()

        batch(() => {
            a(1)
            dispose()
            a(2)
        })

        expect(spy).not.toHaveBeenCalled()
    })

    it("should not rerun parent effect if a nested child effect's signal's value changes", () => {
        const parentSignal = signal(0)
        const childSignal = signal(0)

        const parentEffect = vi.fn(() => {
            parentSignal()
        })
        const childEffect = vi.fn(() => {
            childSignal()
        })

        effect(() => {
            parentEffect()
            effect(childEffect)
        })

        expect(parentEffect).toHaveBeenCalledTimes(1)
        expect(childEffect).toHaveBeenCalledTimes(1)

        childSignal(1)

        expect(parentEffect).toHaveBeenCalledTimes(1)
        expect(childEffect).toHaveBeenCalledTimes(2)

        parentSignal(1)

        expect(parentEffect).toHaveBeenCalledTimes(2)
        expect(childEffect).toHaveBeenCalledTimes(3)
    })
})

describe("memo()", () => {
    it("should return value", () => {
        const a = signal("a")
        const b = signal("b")

        const c = memo(() => a() + b())
        expect(c()).toBe("ab")
    })

    it("should return updated value", () => {
        const a = signal("a")
        const b = signal("b")

        const c = memo(() => a() + b())
        expect(c()).toBe("ab")

        a("aa")
        expect(c()).toBe("aab")
    })

    it("should be lazily computed on demand", () => {
        const a = signal("a")
        const b = signal("b")
        const spy = vi.fn(() => a() + b())
        const c = memo(spy)
        expect(spy).not.toHaveBeenCalled()
        c()
        expect(spy).toHaveBeenCalledTimes(1)
        a("x")
        b("y")
        expect(spy).toHaveBeenCalledTimes(1)
        c()
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should be computed only when a dependency has changed at some point", () => {
        const a = signal("a")
        const spy = vi.fn(() => {
            return a()
        })
        const c = memo(spy)
        c()
        expect(spy).toHaveBeenCalledTimes(1)
        a("a")
        c()
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should recompute if a dependency changes during computation after becoming a dependency", () => {
        const a = signal(0)
        const spy = vi.fn(() => {
            a(a() + 1)
        })
        const c = memo(spy)
        c()
        expect(spy).toHaveBeenCalledTimes(1)
        c()
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should detect simple dependency cycles", () => {
        const a: any = memo(() => a())
        expect(() => a()).toThrow(/Cycle detected/)
    })

    it("should detect deep dependency cycles", () => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const a: any = memo(() => b())
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const b: any = memo(() => c())
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const c: any = memo(() => d())
        const d: any = memo(() => a())
        expect(() => a()).toThrow(/Cycle detected/)
    })

    it("should not allow a computed signal to become a direct dependency of itself", () => {
        const spy = vi.fn(() => {
            try {
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                a()
            }
            catch {
                // pass
            }
        })
        const a = memo(spy)
        a()
        expect(() => effect(() => a())).not.toThrow()
    })

    it("should store thrown errors and recompute only after a dependency changes", () => {
        const a = signal(0)
        const spy = vi.fn(() => {
            a()
            // eslint-disable-next-line unicorn/error-message
            throw new Error()
        })
        const c = memo(spy)
        expect(() => c()).toThrow()
        expect(() => c()).toThrow()
        expect(spy).toHaveBeenCalledTimes(1)
        a(1)
        expect(() => c()).toThrow()
        expect(spy).toHaveBeenCalledTimes(2)
    })

    it("should conditionally unsubscribe from signals", () => {
        const a = signal("a")
        const b = signal("b")
        const cond = signal(true)

        const spy = vi.fn(() => {
            return cond() ? a() : b()
        })

        const c = memo(spy)
        expect(c()).toBe("a")
        expect(spy).toHaveBeenCalledTimes(1)

        b("bb")
        expect(c()).toBe("a")
        expect(spy).toHaveBeenCalledTimes(1)

        cond(false)
        expect(c()).toBe("bb")
        expect(spy).toHaveBeenCalledTimes(2)

        spy.mockClear()

        a("aaa")
        expect(c()).toBe("bb")
        expect(spy).not.toHaveBeenCalled()
    })

    it("should consider undefined value separate from uninitialized value", () => {
        const a = signal(0)
        const spy = vi.fn(() => undefined)
        const c = memo(spy)

        expect(c()).toBeUndefined()
        a(1)
        expect(c()).toBeUndefined()
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should not leak errors raised by dependencies", () => {
        const a = signal(0)
        const b = memo(() => {
            a()
            throw new Error("error")
        })
        const c = memo(() => {
            try {
                b()
            }
            catch {
                return "ok"
            }
            return undefined
        })
        expect(c()).toBe("ok")
        a(1)
        expect(c()).toBe("ok")
    })

    it("should propagate notifications even right after first subscription", () => {
        const a = signal(0)
        const b = memo(() => a())
        const c = memo(() => b())
        c()

        const spy = vi.fn(() => {
            c()
        })

        effect(spy)
        expect(spy).toHaveBeenCalledTimes(1)
        spy.mockClear()

        a(1)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should get marked as outdated right after first subscription", () => {
        const s = signal(0)
        const c = memo(() => s())
        c()

        s(1)
        effect(() => {
            c()
        })
        expect(c()).toBe(1)
    })

    it("should propagate notification to other listeners after one listener is disposed", () => {
        const s = signal(0)
        const c = memo(() => s())

        const spy1 = vi.fn(() => {
            c()
        })
        const spy2 = vi.fn(() => {
            c()
        })
        const spy3 = vi.fn(() => {
            c()
        })

        effect(spy1)
        const dispose = effect(spy2)
        effect(spy3)

        expect(spy1).toHaveBeenCalledTimes(1)
        expect(spy2).toHaveBeenCalledTimes(1)
        expect(spy3).toHaveBeenCalledTimes(1)

        dispose()

        s(1)
        expect(spy1).toHaveBeenCalledTimes(2)
        expect(spy2).toHaveBeenCalledTimes(1)
        expect(spy3).toHaveBeenCalledTimes(2)
    })

    it("should not recompute dependencies out of order", () => {
        const a = signal(1)
        const b = signal(1)
        const c = signal(1)

        const spy = vi.fn(() => c())
        const d = memo(spy)

        const e = memo(() => {
            if (a() > 0) {
                b()
                d()
            }
            else {
                b()
            }
        })

        e()
        spy.mockClear()

        a(2)
        b(2)
        c(2)
        e()
        expect(spy).toHaveBeenCalledTimes(1)
        spy.mockClear()

        a(-1)
        b(-1)
        c(-1)
        e()
        expect(spy).not.toHaveBeenCalled()
        spy.mockClear()
    })

    it("should not recompute dependencies unnecessarily", () => {
        const spy = vi.fn()
        const a = signal(0)
        const b = signal(0)
        const c = memo(() => {
            b()
            spy()
        })
        const d = memo(() => {
            if (a() === 0) {
                c()
            }
        })
        d()
        expect(spy).toHaveBeenCalledTimes(1)

        batch(() => {
            b(1)
            a(1)
        })
        d()
        expect(spy).toHaveBeenCalledTimes(1)
    })

    describe(".peek()", () => {
        it("should get value", () => {
            const s = signal(1)
            const c = memo(() => s())
            expect(peek(c)).toBe(1)
        })

        it("should throw when evaluation throws", () => {
            const c = memo(() => {
                throw new Error("test")
            })
            expect(() => peek(c)).toThrow("test")
        })

        it("should throw when previous evaluation threw and dependencies haven't changed", () => {
            const c = memo(() => {
                throw new Error("test")
            })
            expect(() => c()).toThrow("test")
            expect(() => peek(c)).toThrow("test")
        })

        it("should refresh value if stale", () => {
            const a = signal(1)
            const b = memo(() => a())
            expect(peek(b)).toBe(1)

            a(2)
            expect(peek(b)).toBe(2)
        })

        it("should detect simple dependency cycles", () => {
            const a: any = memo(() => peek(a))
            expect(() => peek(a)).toThrow(/Cycle detected/)
        })

        it("should detect deep dependency cycles", () => {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            const a: any = memo(() => b())
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            const b: any = memo(() => c())
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            const c: any = memo(() => d())
            const d: any = memo(() => peek(a))
            expect(() => peek(a)).toThrow(/Cycle detected/)
        })

        it("should not make surrounding effect depend on the computed", () => {
            const s = signal(1)
            const c = memo(() => s())
            const spy = vi.fn(() => {
                peek(c)
            })

            effect(spy)
            expect(spy).toHaveBeenCalledTimes(1)

            s(2)
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it("should not make surrounding computed depend on the computed", () => {
            const s = signal(1)
            const c = memo(() => s())

            const spy = vi.fn(() => {
                peek(c)
            })

            const d = memo(spy)
            d()
            expect(spy).toHaveBeenCalledTimes(1)

            s(2)
            d()
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it("should not make surrounding effect depend on the peeked computed's dependencies", () => {
            const a = signal(1)
            const b = memo(() => a())
            const spy = vi.fn()
            effect(() => {
                spy()
                peek(b)
            })
            expect(spy).toHaveBeenCalledTimes(1)
            spy.mockClear()

            a(1)
            expect(spy).not.toHaveBeenCalled()
        })

        it("should not make surrounding computed depend on peeked computed's dependencies", () => {
            const a = signal(1)
            const b = memo(() => a())
            const spy = vi.fn()
            const d = memo(() => {
                spy()
                peek(b)
            })
            d()
            expect(spy).toHaveBeenCalledTimes(1)
            spy.mockClear()

            a(1)
            d()
            expect(spy).not.toHaveBeenCalled()
        })
    })

    describe("garbage collection", () => {
        // Skip GC tests if global.gc is not defined.
        it("should be garbage collectable if nothing is listening to its changes", async () => {
            if (typeof gc === "undefined") {
                return
            }
            const s = signal(0)
            const ref = new WeakRef(memo(() => s()));

            (gc as () => void)()
            await new Promise(resolve => setTimeout(resolve, 0));
            (gc as () => void)()
            expect(ref.deref()).toBeUndefined()
        })

        it("should be garbage collectable after it has lost all of its listeners", async () => {
            if (typeof gc === "undefined") {
                return
            }
            const s = signal(0)

            let ref: WeakRef<any>
            let dispose: () => void;
            (function () {
                const c = memo(() => s())
                ref = new WeakRef(c)
                dispose = effect(() => {
                    c()
                })
            })()

            dispose();
            (gc as () => void)()
            await new Promise(resolve => setTimeout(resolve, 0));
            (gc as () => void)()
            expect(ref.deref()).toBeUndefined()
        })
    })

    describe("graph updates", () => {
        it("should run computeds once for multiple dep changes", async () => {
            const a = signal("a")
            const b = signal("b")

            const compute = vi.fn(() => {
                // debugger;
                return a() + b()
            })
            const c = memo(compute)

            expect(c()).toBe("ab")
            expect(compute).toHaveBeenCalledTimes(1)
            compute.mockClear()

            a("aa")
            b("bb")
            c()
            expect(compute).toHaveBeenCalledTimes(1)
        })

        it("should drop A->B->A updates", async () => {
            //     A
            //   / |
            //  B  | <- Looks like a flag doesn't it? :D
            //   \ |
            //     C
            //     |
            //     D
            const a = signal(2)

            const b = memo(() => a() - 1)
            const c = memo(() => a() + b())

            const compute = vi.fn(() => `d: ${c()}`)
            const d = memo(compute)

            // Trigger read
            expect(d()).toBe("d: 3")
            expect(compute).toHaveBeenCalledTimes(1)
            compute.mockClear()

            a(4)
            d()
            expect(compute).toHaveBeenCalledTimes(1)
        })

        it("should only update every signal once (diamond graph)", () => {
            // In this scenario "D" should only update once when "A" receives
            // an update. This is sometimes referred to as the "diamond" scenario.
            //     A
            //   /   \
            //  B     C
            //   \   /
            //     D
            const a = signal("a")
            const b = memo(() => a())
            const c = memo(() => a())

            const spy = vi.fn(() => `${b()} ${c()}`)
            const d = memo(spy)

            expect(d()).toBe("a a")
            expect(spy).toHaveBeenCalledTimes(1)

            a("aa")
            expect(d()).toBe("aa aa")
            expect(spy).toHaveBeenCalledTimes(2)
        })

        it("should only update every signal once (diamond graph + tail)", () => {
            // "E" will be likely updated twice if our mark+sweep logic is buggy.
            //     A
            //   /   \
            //  B     C
            //   \   /
            //     D
            //     |
            //     E
            const a = signal("a")
            const b = memo(() => a())
            const c = memo(() => a())

            const d = memo(() => `${b()} ${c()}`)

            const spy = vi.fn(() => d())
            const e = memo(spy)

            expect(e()).toBe("a a")
            expect(spy).toHaveBeenCalledTimes(1)

            a("aa")
            expect(e()).toBe("aa aa")
            expect(spy).toHaveBeenCalledTimes(2)
        })

        it("should bail out if result is the same", () => {
            // Bail out if value of "B" never changes
            // A->B->C
            const a = signal("a")
            const b = memo(() => {
                a()
                return "foo"
            })

            const spy = vi.fn(() => b())
            const c = memo(spy)

            expect(c()).toBe("foo")
            expect(spy).toHaveBeenCalledTimes(1)

            a("aa")
            expect(c()).toBe("foo")
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it("should only update every signal once (jagged diamond graph + tails)", () => {
            // "F" and "G" will be likely updated twice if our mark+sweep logic is buggy.
            //     A
            //   /   \
            //  B     C
            //  |     |
            //  |     D
            //   \   /
            //     E
            //   /   \
            //  F     G
            const a = signal("a")

            const b = memo(() => a())
            const c = memo(() => a())

            const d = memo(() => c())

            const eSpy = vi.fn(() => `${b()} ${d()}`)
            const e = memo(eSpy)

            const fSpy = vi.fn(() => e())
            const f = memo(fSpy)
            const gSpy = vi.fn(() => e())
            const g = memo(gSpy)

            expect(f()).toBe("a a")
            expect(fSpy).toHaveBeenCalledTimes(1)

            expect(g()).toBe("a a")
            expect(gSpy).toHaveBeenCalledTimes(1)

            eSpy.mockClear()
            fSpy.mockClear()
            gSpy.mockClear()

            a("b")

            expect(e()).toBe("b b")
            expect(eSpy).toHaveBeenCalledTimes(1)

            expect(f()).toBe("b b")
            expect(fSpy).toHaveBeenCalledTimes(1)

            expect(g()).toBe("b b")
            expect(gSpy).toHaveBeenCalledTimes(1)

            eSpy.mockClear()
            fSpy.mockClear()
            gSpy.mockClear()

            a("c")

            expect(e()).toBe("c c")
            expect(eSpy).toHaveBeenCalledTimes(1)

            expect(f()).toBe("c c")
            expect(fSpy).toHaveBeenCalledTimes(1)

            expect(g()).toBe("c c")
            expect(gSpy).toHaveBeenCalledTimes(1)

            eSpy.mockClear()
            fSpy.mockClear()
            gSpy.mockClear()

            a("d")

            expect(e()).toBe("d d")
            expect(eSpy).toHaveBeenCalledTimes(1)

            expect(f()).toBe("d d")
            expect(fSpy).toHaveBeenCalledTimes(1)

            expect(g()).toBe("d d")
            expect(gSpy).toHaveBeenCalledTimes(1)

            // top to bottom
            expect(eSpy.mock.invocationCallOrder[0]).toBeLessThan(fSpy.mock.invocationCallOrder[0]!)
            // left to right
            expect(fSpy.mock.invocationCallOrder[0]).toBeLessThan(gSpy.mock.invocationCallOrder[0]!)
        })

        it("should only subscribe to signals listened to", () => {
            //    *A
            //   /   \
            // *B     C <- we don't listen to C
            const a = signal("a")

            const b = memo(() => a())
            const spy = vi.fn(() => a())
            memo(spy)

            expect(b()).toBe("a")
            expect(spy).not.toHaveBeenCalled()

            a("aa")
            expect(b()).toBe("aa")
            expect(spy).not.toHaveBeenCalled()
        })

        it("should only subscribe to signals listened to", () => {
            // Here both "B" and "C" are active in the beginning, but
            // "B" becomes inactive later. At that point it should
            // not receive any updates anymore.
            //    *A
            //   /   \
            // *B     D <- we don't listen to C
            //  |
            // *C
            const a = signal("a")
            const spyB = vi.fn(() => a())
            const b = memo(spyB)

            const spyC = vi.fn(() => b())
            const c = memo(spyC)

            const d = memo(() => a())

            let result = ""
            const unsub = effect(() => {
                result = c()
            })

            expect(result).toBe("a")
            expect(d()).toBe("a")

            spyB.mockClear()
            spyC.mockClear()
            unsub()

            a("aa")

            expect(spyB).not.toHaveBeenCalled()
            expect(spyC).not.toHaveBeenCalled()
            expect(d()).toBe("aa")
        })

        it("should ensure subs update even if one dep unmarks it", () => {
            // In this scenario "C" always returns the same value. When "A"
            // changes, "B" will update, then "C" at which point its update
            // to "D" will be unmarked. But "D" must still update because
            // "B" marked it. If "D" isn't updated, then we have a bug.
            //     A
            //   /   \
            //  B     *C <- returns same value every time
            //   \   /
            //     D
            const a = signal("a")
            const b = memo(() => a())
            const c = memo(() => {
                a()
                return "c"
            })
            const spy = vi.fn(() => `${b()} ${c()}`)
            const d = memo(spy)
            expect(d()).toBe("a c")
            spy.mockClear()

            a("aa")
            d()
            expect(spy).toHaveReturnedWith("aa c")
        })

        it("should ensure subs update even if two deps unmark it", () => {
            // In this scenario both "C" and "D" always return the same
            // value. But "E" must still update because "A"  marked it.
            // If "E" isn't updated, then we have a bug.
            //     A
            //   / | \
            //  B *C *D
            //   \ | /
            //     E
            const a = signal("a")
            const b = memo(() => a())
            const c = memo(() => {
                a()
                return "c"
            })
            const d = memo(() => {
                a()
                return "d"
            })
            const spy = vi.fn(() => `${b()} ${c()} ${d()}`)
            const e = memo(spy)
            expect(e()).toBe("a c d")
            spy.mockClear()

            a("aa")
            e()
            expect(spy).toHaveReturnedWith("aa c d")
        })
    })

    describe("error handling", () => {
        it("should keep graph consistent on errors during activation", () => {
            const a = signal(0)
            const b = memo(() => {
                throw new Error("fail")
            })
            const c = memo(() => a())
            expect(() => b()).toThrow("fail")

            a(1)
            expect(c()).toBe(1)
        })

        it("should keep graph consistent on errors in computeds", () => {
            const a = signal(0)
            const b = memo(() => {
                if (a() === 1) throw new Error("fail")
                return a()
            })
            const c = memo(() => b())
            expect(c()).toBe(0)

            a(1)
            expect(() => b()).toThrow("fail")

            a(2)
            expect(c()).toBe(2)
        })

        it("should support lazy branches", () => {
            const a = signal(0)
            const b = memo(() => a())
            const c = memo(() => (a() > 0 ? a() : b()))

            expect(c()).toBe(0)
            a(1)
            expect(c()).toBe(1)

            a(0)
            expect(c()).toBe(0)
        })

        it("should not update a sub if all deps unmark it", () => {
            // In this scenario "B" and "C" always return the same value. When "A"
            // changes, "D" should not update.
            //     A
            //   /   \
            // *B     *C
            //   \   /
            //     D
            const a = signal("a")
            const b = memo(() => {
                a()
                return "b"
            })
            const c = memo(() => {
                a()
                return "c"
            })
            const spy = vi.fn(() => `${b()} ${c()}`)
            const d = memo(spy)
            expect(d()).toBe("b c")
            spy.mockClear()

            a("aa")
            expect(spy).not.toHaveBeenCalled()
        })
    })
})

describe("batch/transaction", () => {
    it("should return the value from the callback", () => {
        expect(batch(() => 1)).toBe(1)
    })

    it("should throw errors thrown from the callback", () => {
        expect(() =>
            batch(() => {
                throw new Error("hello")
            }),
        ).toThrow("hello")
    })

    it("should throw non-errors thrown from the callback", () => {
        try {
            batch(() => {
                // eslint-disable-next-line no-throw-literal
                throw undefined
            })
            expect.unreachable()
        }
        catch (err) {
            expect(err).toBeUndefined()
        }
    })

    it("should delay writes", () => {
        const a = signal("a")
        const b = signal("b")
        const spy = vi.fn(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            `${a()} ${b()}`
        })
        effect(spy)
        spy.mockClear()

        batch(() => {
            a("aa")
            b("bb")
        })

        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should delay writes until outermost batch is complete", () => {
        const a = signal("a")
        const b = signal("b")
        const spy = vi.fn(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            `${a()}, ${b()}`
        })
        effect(spy)
        spy.mockClear()

        batch(() => {
            batch(() => {
                a(v => `${v} inner`)
                b(v => `${v} inner`)
            })
            a(v => `${v} outer`)
            b(v => `${v} outer`)
        })

        // If the inner batch() would have flushed the update
        // this spy would've been called twice.
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should read signals written to", () => {
        const a = signal("a")

        let result = ""
        batch(() => {
            a("aa")
            result = a()
        })

        expect(result).toBe("aa")
    })

    it("should read memo signals with updated source signals", () => {
        // A->B->C->D->E
        const a = signal("a")
        const b = memo(() => a())

        const spyC = vi.fn(() => b())
        const c = memo(spyC)

        const spyD = vi.fn(() => c())
        const d = memo(spyD)

        const spyE = vi.fn(() => d())
        const e = memo(spyE)

        spyC.mockClear()
        spyD.mockClear()
        spyE.mockClear()

        let result = ""
        batch(() => {
            a("aa")
            result = c()

            // Since "D" isn't accessed during batching, we should not
            // update it, only after batching has completed
            expect(spyD).not.toHaveBeenCalled()
        })

        expect(result).toBe("aa")
        expect(d()).toBe("aa")
        expect(e()).toBe("aa")
        expect(spyC).toHaveBeenCalledTimes(1)
        expect(spyD).toHaveBeenCalledTimes(1)
        expect(spyE).toHaveBeenCalledTimes(1)
    })

    it("should not block writes after batching completed", () => {
        // If no further writes after batch() are possible, than we
        // didn't restore state properly. Most likely "pending" still
        // holds elements that are already processed.
        const a = signal("a")
        const b = signal("b")
        const c = signal("c")
        const d = memo(() => `${a()} ${b()} ${c()}`)

        let result = ""
        effect(() => {
            result = d()
        })

        batch(() => {
            a("aa")
            b("bb")
        })
        c("cc")
        expect(result).toBe("aa bb cc")
    })

    it("should not lead to stale signals with .value in batch", () => {
        const invokes: number[][] = []
        const counter = signal(0)
        const double = memo(() => counter() * 2)
        const triple = memo(() => counter() * 3)

        effect(() => {
            invokes.push([double(), triple()])
        })

        expect(invokes).toEqual([[0, 0]])

        batch(() => {
            counter(1)
            expect(double()).toBe(2)
        })

        expect(invokes[1]).toEqual([2, 3])
    })

    it("should not lead to stale signals with peek() in batch", () => {
        const invokes: number[][] = []
        const counter = signal(0)
        const double = memo(() => counter() * 2)
        const triple = memo(() => counter() * 3)

        effect(() => {
            invokes.push([double(), triple()])
        })

        expect(invokes).toEqual([[0, 0]])

        batch(() => {
            counter(1)
            expect(peek(double)).toBe(2)
        })

        expect(invokes[1]).toEqual([2, 3])
    })

    it("should run pending effects even if the callback throws", () => {
        const a = signal(0)
        const b = signal(1)
        const spy1 = vi.fn(() => {
            a()
        })
        const spy2 = vi.fn(() => {
            b()
        })
        effect(spy1)
        effect(spy2)
        spy1.mockClear()
        spy2.mockClear()

        expect(() =>
            batch(() => {
                a(v => v + 1)
                b(v => v + 1)
                throw new Error("hello")
            }),
        ).toThrow("hello")

        expect(spy1).toHaveBeenCalledTimes(1)
        expect(spy2).toHaveBeenCalledTimes(1)
    })

    it("should run pending effects even if some effects throw", () => {
        const a = signal(0)
        const spy1 = vi.fn(() => {
            a()
        })
        const spy2 = vi.fn(() => {
            a()
        })
        effect(() => {
            if (a() === 1) {
                throw new Error("hello")
            }
        })
        effect(spy1)
        effect(() => {
            if (a() === 1) {
                throw new Error("hello")
            }
        })
        effect(spy2)
        effect(() => {
            if (a() === 1) {
                throw new Error("hello")
            }
        })
        spy1.mockClear()
        spy2.mockClear()

        expect(() =>
            batch(() => {
                a(v => v + 1)
            }),
        ).toThrow("hello")

        expect(spy1).toHaveBeenCalledTimes(1)
        expect(spy2).toHaveBeenCalledTimes(1)
    })

    it("should run effect's first run immediately even inside a batch", () => {
        let callCount = 0
        const spy = vi.fn()
        batch(() => {
            effect(spy)
            callCount = spy.mock.calls.length
        })
        expect(callCount).toBe(1)
    })
})

describe("untracked", () => {
    it("should block tracking inside effects", () => {
        const a = signal(1)
        const b = signal(2)
        const spy = vi.fn(() => {
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            a() + b()
        })
        effect(() => untrack(spy))
        expect(spy).toHaveBeenCalledTimes(1)

        a(10)
        b(20)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should block tracking even when run inside effect run inside untracked", () => {
        const s = signal(1)
        const spy = vi.fn(() => s())

        untrack(() =>
            effect(() => {
                untrack(spy)
            }),
        )
        expect(spy).toHaveBeenCalledTimes(1)

        s(2)
        expect(spy).toHaveBeenCalledTimes(1)
    })

    it("should not cause signal assignments throw", () => {
        const a = signal(1)
        const aChangedTime = signal(0)

        const dispose = effect(() => {
            a()
            untrack(() => {
                aChangedTime(v => v + 1)
            })
        })

        expect(() => a(2)).not.toThrow()
        expect(aChangedTime()).toBe(2)
        a(3)
        expect(aChangedTime()).toBe(3)

        dispose()
    })

    it("should block tracking inside memo signals", () => {
        const a = signal(1)
        const b = signal(2)
        const spy = vi.fn(() => a() + b())
        const c = memo(() => untrack(spy))

        expect(spy).not.toHaveBeenCalled()
        expect(c()).toBe(3)
        a(10)
        c()
        b(20)
        c()
        expect(spy).toHaveBeenCalledTimes(1)
        expect(c()).toBe(3)
    })
})

describe("dependencies", () => {
    /** Counts how many signals are watched, through `onWatch`. */
    function watcher(counts: Record<string, number>, name: string): { onWatch: () => () => void } {
        counts[name] = 0
        return {
            onWatch() {
                counts[name]!++
                return () => void counts[name]!--
            },
        }
    }

    it("should keep a signal that is read in another order, and drop the one that is no longer read", () => {
        const watching: Record<string, number> = {}
        const a = signal(0, watcher(watching, "a"))
        const b = signal(0, watcher(watching, "b"))
        const order = signal<("a" | "b")[]>(["a", "b"])
        const spy = vi.fn(() => {
            for (const name of order()) (name === "a" ? a : b)()
        })
        effect(spy)

        order(["b", "a"])
        expect(watching).toEqual({ a: 1, b: 1 })
        a(1)
        b(1)
        expect(spy).toHaveBeenCalledTimes(4)

        order(["b"])
        expect(watching).toEqual({ a: 0, b: 1 })
        a(2)
        expect(spy).toHaveBeenCalledTimes(5)
    })

    it("should keep a signal that is read again after a memo read it in between", () => {
        const watching: Record<string, number> = {}
        const a = signal(0, watcher(watching, "a"))
        const double = memo(() => a() * 2)
        const spy = vi.fn(() => void (a() + double() + a()))
        const dispose = effect(spy)

        for (let i = 1; i <= 3; i++) a(i)
        expect(spy).toHaveBeenCalledTimes(4)
        expect(watching).toEqual({ a: 1 })

        dispose()
        expect(watching).toEqual({ a: 0 })
        a(4)
        expect(spy).toHaveBeenCalledTimes(4)
    })

    it("should depend once on a signal that is read several times", () => {
        const a = signal(0)
        const b = signal(0)
        const spy = vi.fn(() => {
            for (let i = 0; i < 3; i++) void (a() + b())
        })
        effect(spy)
        a(1)
        b(1)
        batch(() => {
            a(2)
            b(2)
        })
        expect(spy).toHaveBeenCalledTimes(4)
    })
})
