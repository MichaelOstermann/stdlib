import type { Root } from "react-dom/client"
import type { Transition, UseTransitionStatus } from "../src/useTransitionStatus"
import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, expectTypeOf, it } from "bun:test"
import { act, createElement, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { useTransitionStatus } from "../src/useTransitionStatus"

const globals = globalThis as { cancelAnimationFrame: unknown, IS_REACT_ACT_ENVIRONMENT?: boolean, requestAnimationFrame: unknown }
let frames: Map<number, () => void>
let id = 0
let root: Root | undefined
let mounted = false
let transition: Transition

beforeAll(() => {
    GlobalRegistrator.register()
    globals.IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(async () => {
    delete globals.IS_REACT_ACT_ENVIRONMENT
    await GlobalRegistrator.unregister()
})

beforeEach(() => {
    frames = new Map()
    globals.requestAnimationFrame = (callback: () => void) => frames.set(++id, callback) && id
    globals.cancelAnimationFrame = (id: number) => frames.delete(id)
})

afterEach(() => {
    act(() => root?.unmount())
    root = undefined
})

function Probe(): null {
    [mounted, transition] = useTransitionStatus({ closeDuration: 10, openDuration: 10 })
    return null
}

function render(strict = false): void {
    root = createRoot(document.createElement("div"))
    act(() => root!.render(strict ? createElement(StrictMode, null, createElement(Probe)) : createElement(Probe)))
}

function frame(): void {
    const callbacks = [...frames.values()]
    frames.clear()
    act(() => {
        for (const callback of callbacks) callback()
    })
}

async function sleep(ms: number): Promise<void> {
    await act(() => Bun.sleep(ms))
}

function set(open: boolean): void {
    act(() => void transition.$open(open))
}

describe("useTransitionStatus", () => {
    it("should start closed and unmounted", () => {
        const Status = (): string => String(useTransitionStatus({ closeDuration: 200, openDuration: 250 })[0])
        expect(renderToString(createElement(Status))).toBe("false")
        render()
        expect(mounted).toBe(false)
        expect(transition.$status()).toBe("closed")
        expectTypeOf(useTransitionStatus).returns.toEqualTypeOf<UseTransitionStatus>()
    })

    it("should mount, paint closed, then open over two frames and openDuration", async () => {
        render()
        set(true)
        expect(mounted).toBe(true)
        expect(transition.$status()).toBe("closed")
        frame()
        expect(transition.$status()).toBe("closed")
        frame()
        expect(transition.$status()).toBe("opening")
        await sleep(15)
        expect(transition.$status()).toBe("opened")
    })

    it("should close over closeDuration, then unmount", async () => {
        render()
        set(true)
        frame()
        frame()
        set(false)
        expect(transition.$status()).toBe("closing")
        expect(mounted).toBe(true)
        await sleep(15)
        expect(transition.$status()).toBe("closed")
        expect(mounted).toBe(false)
    })

    it("should unmount right away when closed before it was painted open", () => {
        render()
        set(true)
        set(false)
        expect(mounted).toBe(false)
        set(true)
        frame()
        set(false)
        frame()
        expect(mounted).toBe(false)
        expect(transition.$status()).toBe("closed")
        expect(frames.size).toBe(0)
    })

    it("should switch back to opening when opened while closing", async () => {
        render()
        set(true)
        frame()
        frame()
        set(false)
        set(true)
        expect(transition.$status()).toBe("opening")
        await sleep(15)
        expect(transition.$status()).toBe("opened")
        expect(mounted).toBe(true)
    })

    it("should stop following $open once the component unmounts", async () => {
        render()
        set(true)
        frame()
        frame()
        act(() => root!.unmount())
        root = undefined
        await sleep(15)
        expect(transition.$status()).toBe("opening")
    })

    it("should open in StrictMode, where effects are disposed and started again", async () => {
        render(true)
        set(true)
        frame()
        frame()
        expect(transition.$status()).toBe("opening")
        await sleep(15)
        expect(transition.$status()).toBe("opened")
    })
})
