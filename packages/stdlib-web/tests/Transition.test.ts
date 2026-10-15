import { Effect } from "@monstermann/stdlib"
import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { Transition } from "../src/Transition"

const options = { closeDuration: 20, openDuration: 20 }
let frames: Map<number, () => void>
let frameId: number

/** Runs the callbacks requested so far, not the ones they request in turn. */
function frame(): void {
    const callbacks = [...frames.values()]
    frames.clear()
    for (const callback of callbacks) callback()
}

beforeEach(() => {
    frames = new Map()
    frameId = 0
    globalThis.requestAnimationFrame = (callback) => {
        frames.set(++frameId, () => callback(0))
        return frameId
    }
    globalThis.cancelAnimationFrame = id => void frames.delete(id)
})

afterEach(() => {
    // @ts-expect-error does not exist outside of a browser
    delete globalThis.requestAnimationFrame
    // @ts-expect-error does not exist outside of a browser
    delete globalThis.cancelAnimationFrame
})

describe("Transition", () => {
    it("should start as closed, or as opened", () => {
        const closed = Transition(options)
        expect([closed.$open(), closed.$status(), closed.$mounted()]).toEqual([false, "closed", false])

        const opened = Transition({ ...options, open: true })
        expect([opened.$open(), opened.$status(), opened.$mounted()]).toEqual([true, "opened", true])
    })

    it("should be mounted two frames before opening", () => {
        const transition = Transition(options)
        transition.open()
        expect([transition.$open(), transition.$status(), transition.$mounted()]).toEqual([true, "closed", true])
        frame()
        expect(transition.$status()).toBe("closed")
        frame()
        expect(transition.$status()).toBe("opening")
    })

    it("should be opened after openDuration, and closed after closeDuration", async () => {
        const transition = Transition({ closeDuration: 60, openDuration: 20 })
        transition.open()
        frame()
        frame()
        await Bun.sleep(10)
        expect(transition.$status()).toBe("opening")
        await Bun.sleep(20)
        expect(transition.$status()).toBe("opened")

        transition.close()
        expect([transition.$status(), transition.$mounted()]).toEqual(["closing", true])
        await Bun.sleep(30)
        expect([transition.$status(), transition.$mounted()]).toEqual(["closing", true])
        await Bun.sleep(40)
        expect([transition.$status(), transition.$mounted()]).toEqual(["closed", false])
    })

    it("should close while opening, without becoming opened", async () => {
        const statuses: string[] = []
        const transition = Transition(options)
        Effect(() => void statuses.push(transition.$status()))
        transition.open()
        frame()
        frame()
        transition.close()
        await Bun.sleep(40)
        expect(statuses).toEqual(["closed", "opening", "closing", "closed"])
    })

    it("should open again while closing, without waiting for frames", async () => {
        const transition = Transition({ ...options, open: true })
        transition.close()
        transition.open()
        expect(transition.$status()).toBe("opening")
        await Bun.sleep(30)
        expect(transition.$status()).toBe("opened")
    })

    it("should stay closed when closed before the two frames passed", async () => {
        const transition = Transition(options)
        transition.open()
        frame()
        transition.close()
        frame()
        await Bun.sleep(30)
        expect([transition.$status(), transition.$mounted()]).toEqual(["closed", false])
    })

    it("should become opened when closed and opened again while opening", async () => {
        const transition = Transition(options)
        transition.open()
        frame()
        frame()
        transition.close()
        transition.open()
        expect(transition.$status()).toBe("opening")
        await Bun.sleep(30)
        expect(transition.$status()).toBe("opened")
    })

    it("should toggle", () => {
        const transition = Transition(options)
        transition.toggle()
        expect(transition.$open()).toBe(true)
        transition.toggle()
        expect(transition.$open()).toBe(false)
    })

    it("should go through every status for an effect", async () => {
        const statuses: string[] = []
        const transition = Transition(options)
        Effect(() => void statuses.push(transition.$status()))
        transition.open()
        frame()
        frame()
        await Bun.sleep(30)
        transition.close()
        await Bun.sleep(30)
        expect(statuses).toEqual(["closed", "opening", "opened", "closing", "closed"])
    })

    it("should keep its status once disposed", async () => {
        const transition = Transition(options)
        transition.open()
        frame()
        frame()
        transition.dispose()
        await Bun.sleep(30)
        expect(transition.$status()).toBe("opening")
        transition.close()
        expect([transition.$open(), transition.$status(), transition.disposed]).toEqual([true, "opening", true])
    })
})
