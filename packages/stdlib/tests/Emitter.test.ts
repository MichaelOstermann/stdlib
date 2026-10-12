import type { ReadonlyEmitter } from "../src/Emitter"
import { describe, expect, it, vi } from "bun:test"
import { Batch } from "../src/Batch"
import { Disposer } from "../src/Disposer"
import { AsyncEmitter, Emitter } from "../src/Emitter"
import { Signal } from "../src/Signal"
import { effect } from "./Signal/helpers"

describe("Emitter", () => {
    it("should call listeners with the message, in the order they were added", () => {
        const log: string[] = []
        const onMessage = Emitter<string>()
        onMessage(message => log.push(`a ${message}`))
        onMessage(message => log.push(`b ${message}`))
        onMessage("hello")
        expect(log).toEqual(["a hello", "b hello"])
    })

    it("should work without a message", () => {
        let calls = 0
        const onTick = Emitter()
        onTick(() => calls++)
        onTick()
        onTick()
        expect(calls).toBe(2)
    })

    it("should remove a listener", () => {
        let calls = 0
        const onTick = Emitter<number>()
        const remove = onTick(() => calls++)
        onTick(1)
        remove()
        remove()
        onTick(2)
        expect(calls).toBe(1)
        expect(onTick.listeners.size).toBe(0)
    })

    it("should count the same function once, and call one that is added while sending", () => {
        const log: string[] = []
        const onTick = Emitter<number>()
        const late = (): void => void log.push("late")
        const listener = (): void => {
            log.push("first")
            onTick(late)
        }
        onTick(listener)
        onTick(listener)
        expect(onTick.listeners.size).toBe(1)
        onTick(1)
        expect(log).toEqual(["first", "late"])
    })

    it("should remove all listeners", () => {
        let calls = 0
        const onTick = Emitter<number>()
        onTick(() => calls++)
        onTick(() => calls++)
        onTick.clear()
        onTick(1)
        expect(calls).toBe(0)
    })

    it("should send messages that are nothing, or objects", () => {
        const log: unknown[] = []
        const onValue = Emitter<{ id: number } | null | undefined>()
        onValue(value => log.push(value))
        onValue(null)
        onValue(undefined)
        onValue({ id: 1 })
        expect(log).toEqual([null, undefined, { id: 1 }])
    })

    it("should let listeners be called another way", () => {
        const log: string[] = []
        const onMessage = Emitter<string>((listeners, message) => {
            log.push("before")
            for (const listener of listeners) {
                try {
                    listener(message)
                }
                catch {
                    log.push("caught")
                }
            }
            log.push("after")
        })
        onMessage(() => {
            throw new Error("failed")
        })
        onMessage(message => log.push(message))
        onMessage("hello")
        expect(log).toEqual(["before", "caught", "hello", "after"])
    })

    it("should stop at a listener that throws", () => {
        let calls = 0
        const onTick = Emitter<number>()
        onTick(() => {
            throw new Error("failed")
        })
        onTick(() => calls++)
        expect(() => onTick(1)).toThrow("failed")
        expect(calls).toBe(0)
    })

    it("should be something that can only be listened to", () => {
        const onMessage = Emitter<string>()
        const readonly: ReadonlyEmitter<string> = onMessage
        // @ts-expect-error a message is no listener
        expect(() => readonly("hello")).not.toThrow()
        // A function can not be a message.
        const never: never = Emitter<() => void>()
        expect(never).toBeDefined()
    })
})

describe("AsyncEmitter", () => {
    it("should call listeners one after the other, and wait for them", async () => {
        const log: string[] = []
        const onShutdown = AsyncEmitter<string>()
        onShutdown(async (reason) => {
            log.push(`a ${reason}`)
            await new Promise(resolve => setTimeout(resolve, 5))
            log.push("a done")
        })
        onShutdown(reason => void log.push(`b ${reason}`))
        const done = onShutdown("stop")
        expect(log).toEqual(["a stop"])
        await done
        expect(log).toEqual(["a stop", "a done", "b stop"])
    })

    it("should reject with what a listener throws, without calling the rest", async () => {
        let calls = 0
        const onTick = AsyncEmitter<number>()
        onTick(async () => {
            throw new Error("failed")
        })
        onTick(() => void calls++)
        expect(onTick(1)).rejects.toThrow("failed")
        await Promise.resolve()
        expect(calls).toBe(0)
    })

    it("should remove listeners, one and all", async () => {
        let calls = 0
        const onTick = AsyncEmitter()
        const remove = onTick(() => void calls++)
        onTick(() => void calls++)
        remove()
        await onTick()
        expect(calls).toBe(1)
        onTick.clear()
        await onTick()
        expect(calls).toBe(1)
    })

    it("should let listeners be called another way", async () => {
        const log: number[] = []
        const onTick = AsyncEmitter<number>(async (listeners, message) => {
            await Promise.all([...listeners].map(listener => listener(message * 2)))
        })
        onTick(value => void log.push(value))
        await onTick(2)
        expect(log).toEqual([4])
    })
})

describe("Emitter, disposed", () => {
    it("should remove its listeners and ignore new ones", () => {
        let calls = 0
        const onTick = Emitter()
        onTick(() => calls++)
        expect(onTick.disposed).toBe(false)

        onTick.dispose()
        onTick.dispose()
        expect(onTick.disposed).toBe(true)
        expect(onTick.listeners.size).toBe(0)

        const remove = onTick(() => calls++)
        onTick()
        remove()
        expect(calls).toBe(0)
        expect(onTick.listeners.size).toBe(0)
    })

    it("should dispose what has been added to it, before its listeners are removed", () => {
        const log: unknown[] = []
        const onTick = Emitter()
        onTick(() => {})
        onTick.onDispose(() => log.push(["a", onTick.listeners.size]))
        onTick.onDispose(() => log.push(["b", onTick.listeners.size]))
        onTick.dispose()
        expect(log).toEqual([["b", 1], ["a", 1]])
        expect(onTick.listeners.size).toBe(0)

        onTick.onDispose(() => log.push("late"))
        expect(log).toEqual([["b", 1], ["a", 1], "late"])
    })

    it("should be disposed by the disposer it has been added to, and leave it when disposed by itself", () => {
        const parent = Disposer()
        const onTick = Emitter()
        const onTock = AsyncEmitter()
        expect(parent.onDispose(onTick)).toBe(onTick)
        parent.onDispose(onTock)

        onTock.dispose()
        expect((parent as unknown as { vals: { prevVal: unknown } }).vals.prevVal).toBe(undefined)

        onTick(() => {})
        parent.dispose()
        expect(onTick.disposed).toBe(true)
        expect(onTick.listeners.size).toBe(0)
        expect(onTock.disposed).toBe(true)
    })

    it("should work with using, and with dispose as a callback", () => {
        const cb = vi.fn()
        {
            using onTick = Emitter()
            onTick.onDispose(cb)
        }
        expect(cb).toHaveBeenCalledTimes(1)

        const onTick = Emitter()
        const onClose = Emitter<string>()
        onClose(onTick.dispose)
        onClose("now")
        expect(onTick.disposed).toBe(true)
    })

    it("should dispose an emitter that waits", async () => {
        let calls = 0
        const onTick = AsyncEmitter()
        onTick(async () => void calls++)
        await onTick()
        onTick.dispose()
        onTick(async () => void calls++)
        await onTick()
        expect(calls).toBe(1)
        expect(onTick.disposed).toBe(true)
    })
})

describe("Emitter, with signals", () => {
    it("should run effects once every listener has been called", () => {
        const $a = Signal(0)
        const $b = Signal(0)
        const seen: number[][] = []
        effect(() => void seen.push([$a(), $b()]))

        const onTick = Emitter<number>()
        onTick(value => $a(value))
        onTick(value => $b(value))
        onTick(1)
        expect(seen).toEqual([[0, 0], [1, 1]])
    })

    it("should not depend on what listeners read", () => {
        const $a = Signal(0)
        const onTick = Emitter()
        onTick(() => void $a())
        const outer = vi.fn(() => onTick())
        effect(outer)
        $a(1)
        expect(outer).toHaveBeenCalledTimes(1)
    })

    it("should batch and untrack a dispatch of its own, also when it throws", () => {
        const $a = Signal(0)
        const seen: number[] = []
        effect(() => void seen.push($a()))

        const onTick = Emitter<number>((listeners, message) => {
            for (const listener of listeners) listener(message)
            $a(message + 1)
            if (message === 3) throw new Error("dispatch")
        })
        onTick(value => $a(value))
        onTick(1)
        expect(seen).toEqual([0, 2])
        expect(() => onTick(3)).toThrow("dispatch")
        expect(Batch.isActive()).toBe(false)
        expect(seen).toEqual([0, 2, 4])
    })
})
