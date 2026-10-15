import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { Modals } from "../../src/Modals"
import { stack } from "../../src/Modals/stack"
import { fakeDOM, fakeElement } from "../DOM/helpers"

fakeDOM()

const globals = globalThis as { document?: unknown }
const disposers: (() => void)[] = []
let frames: (() => void)[]

/** Two frames: `open()` waits for them before `opening`. */
function paint(): void {
    for (let i = 0; i < 2; i++) {
        for (const callback of frames.splice(0)) callback()
    }
}

function track<T extends { dispose: () => void }>(value: T): T {
    disposers.push(value.dispose)
    return value
}

beforeEach(() => {
    frames = []
    globalThis.requestAnimationFrame = callback => frames.push(() => callback(0))
    globalThis.cancelAnimationFrame = () => {}
    globals.document = { addEventListener: () => {} }
})

afterEach(() => {
    for (const dispose of disposers.splice(0)) dispose()
    // @ts-expect-error does not exist outside of a browser
    delete globalThis.requestAnimationFrame
    // @ts-expect-error does not exist outside of a browser
    delete globalThis.cancelAnimationFrame
    delete globals.document
})

describe("Modals.popover", () => {
    it("should place itself only while mounted", () => {
        const popover = track(Modals.popover())
        popover.$anchor(fakeElement({ height: 20, left: 100, top: 100, width: 80 }).element)
        popover.$floating(fakeElement({ height: 100, left: 0, top: 0, width: 200 }).element as HTMLElement)
        expect(popover.$position()).toBeUndefined()
        popover.open()
        expect(popover.$position()).toMatchObject({ left: 40, top: 124 })
    })

    it("should take a rect as the anchor, which is no trigger", () => {
        const popover = track(Modals.popover())
        popover.$anchor({ height: 0, left: 300, top: 100, width: 0 })
        popover.$floating(fakeElement({ height: 100, left: 0, top: 0, width: 200 }).element as HTMLElement)
        popover.open()
        expect(popover.$position()).toMatchObject({ left: 200, top: 104 })
        expect(popover.$trigger()).toBeNull()
    })

    it("should be on the stack while open, and close the other popovers", () => {
        const a = track(Modals.popover({ name: "a" }))
        const b = track(Modals.popover({ name: "b" }))
        a.open()
        expect(stack).toEqual([a])
        b.open()
        expect(a.$open()).toBe(false)
        expect(stack).toEqual([b])
        b.dispose()
        expect(stack).toEqual([])
    })

    it("should keep the defaults of the options it is not given", () => {
        const popover = track(Modals.popover({ name: "a", placement: undefined }))
        popover.$anchor({ height: 0, left: 300, top: 100, width: 0 })
        popover.$floating(fakeElement({ height: 100, left: 0, top: 0, width: 200 }).element as HTMLElement)
        popover.open()
        expect(popover.$position()).toBeDefined()
    })
})

describe("Modals.tooltip", () => {
    it("should open after the delay, unless closed in the meantime", async () => {
        const tooltip = track(Modals.tooltip({ delay: 10 }))
        tooltip.open()
        expect(tooltip.$open()).toBe(false)
        await Bun.sleep(20)
        expect(tooltip.$open()).toBe(true)
        tooltip.close()
        tooltip.open()
        tooltip.close()
        await Bun.sleep(20)
        expect(tooltip.$open()).toBe(false)
    })

    it("should close when something around its anchor scrolls", () => {
        const scroll = new Set<() => void>()
        const parent = { parentElement: null, addEventListener: (_: string, listener: () => void, options: { signal: AbortSignal }) => {
            scroll.add(listener)
            options.signal.addEventListener("abort", () => scroll.delete(listener))
        } }
        const anchor = { ...fakeElement({ height: 20, left: 100, top: 100, width: 80 }).element, parentElement: parent } as unknown as Element
        const globalStyle = globalThis as { getComputedStyle?: unknown }
        globalStyle.getComputedStyle = () => ({ display: "block", overflow: "auto", overflowX: "", overflowY: "" })

        const tooltip = track(Modals.tooltip({ delay: 0 }))
        tooltip.$anchor(anchor)
        expect(scroll.size).toBe(0)
        tooltip.open()
        expect(scroll.size).toBe(1)
        for (const listener of scroll) listener()
        expect(tooltip.$open()).toBe(false)
        expect(scroll.size).toBe(0)
        delete globalStyle.getComputedStyle
    })
})

describe("Modals.dialog", () => {
    it("should be on the stack while open", () => {
        const dialog = track(Modals.dialog({ name: "note-create" }))
        dialog.open()
        expect(stack).toEqual([dialog])
        paint()
        expect(dialog.$status()).toBe("opening")
        dialog.close()
        expect(stack).toEqual([])
    })
})
