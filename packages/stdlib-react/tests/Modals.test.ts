import type { Modal } from "../src/Modals"
import { Signal } from "@monstermann/stdlib"
import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { Modals } from "../src/Modals"

const { close, onClose, onOpen, open, stack } = Modals

type Listener = (event: { key?: string, target?: unknown }) => void
const listeners = new Map<string, Set<Listener>>()
const globals = globalThis as { document?: unknown }
const disposers: (() => void)[] = []

beforeEach(() => {
    listeners.clear()
    globals.document = {
        addEventListener(type: string, listener: Listener, options: { signal: AbortSignal }) {
            if (!listeners.has(type)) listeners.set(type, new Set())
            listeners.get(type)!.add(listener)
            options.signal.addEventListener("abort", () => listeners.get(type)!.delete(listener))
        },
    }
})

afterEach(() => {
    for (const dispose of disposers.splice(0)) dispose()
    for (const modal of [...stack]) close(modal)
    delete globals.document
})

function fakeElement(): Element {
    const el = { contains: (node: unknown) => node === el || (node as { parent?: unknown })?.parent === el } as unknown as Element
    return el
}

function modal(kind: Modal["kind"], name?: string): Modal & { open: () => void } {
    const result = {
        $floating: Signal<Element | null>(fakeElement()),
        $open: Signal(false),
        $status: Signal("closed" as const),
        $trigger: Signal<Element | null>(fakeElement()),
        kind,
        name,
        open: () => {
            result.$open(true)
            open(result)
        },
    }
    return result
}

function send(type: string, event: { key?: string, target?: unknown }): void {
    for (const listener of listeners.get(type) ?? []) listener(event)
}

describe("Modals", () => {
    it("should keep the modals in the order they opened, once each", () => {
        const a = modal("dialog")
        const b = modal("dialog")
        expect(stack).toEqual([])
        a.open()
        b.open()
        a.open()
        expect(stack).toEqual([a, b])
        close(a)
        close(a)
        expect(stack).toEqual([b])
    })

    it("should only track the modal, closing it is $open(false)", () => {
        const a = modal("dialog")
        a.open()
        close(a)
        expect(a.$open()).toBe(true)
        open(a)
        send("keydown", { key: "Escape", target: { nodeName: "DIV" } })
        expect(a.$open()).toBe(false)
        expect(stack).toEqual([])
    })

    it("should send onOpen and onClose with the modal", () => {
        const events: string[] = []
        disposers.push(onOpen(modal => events.push(`open ${modal.name}`)))
        disposers.push(onClose(modal => events.push(`close ${modal.name}`)))
        const a = modal("dialog", "a")
        a.open()
        close(a)
        expect(events).toEqual(["open a", "close a"])
    })

    it("should close the other popovers when a popover opens", () => {
        const a = modal("popover")
        const b = modal("popover")
        a.open()
        b.open()
        expect(a.$open()).toBe(false)
        expect(stack).toEqual([b])
    })

    it("should close the open popovers when a dialog opens, and keep the dialog when a popover opens in it", () => {
        const a = modal("popover")
        const b = modal("dialog")
        const c = modal("popover")
        a.open()
        b.open()
        expect(a.$open()).toBe(false)
        expect(stack).toEqual([b])
        c.open()
        expect(stack).toEqual([b, c])
    })

    it("should keep the open popovers when a tooltip opens", () => {
        const a = modal("popover")
        const b = modal("tooltip")
        a.open()
        b.open()
        expect(stack).toEqual([a, b])
    })

    it("should close the open tooltips when anything opens", () => {
        const a = modal("tooltip")
        const b = modal("tooltip")
        const c = modal("dialog")
        a.open()
        b.open()
        expect(a.$open()).toBe(false)
        c.open()
        expect(b.$open()).toBe(false)
        expect(stack).toEqual([c])
    })

    it("should close the last opened modal on a click outside, past tooltips", () => {
        const a = modal("dialog")
        const b = modal("popover")
        const tooltip = modal("tooltip")
        a.open()
        b.open()
        tooltip.open()
        send("mousedown", { target: {} })
        expect(b.$open()).toBe(false)
        expect(tooltip.$open()).toBe(true)
        expect(stack).toEqual([a, tooltip])
        send("mousedown", { target: {} })
        expect(a.$open()).toBe(false)
    })

    it("should leave clicks on the modal and on its trigger alone", () => {
        const a = modal("popover")
        a.open()
        send("mousedown", { target: { parent: a.$floating() } })
        send("mousedown", { target: a.$trigger() })
        expect(a.$open()).toBe(true)
    })

    it("should close the top modal on a click in a modal below it", () => {
        const a = modal("dialog")
        const b = modal("dialog")
        a.open()
        b.open()
        send("mousedown", { target: { parent: a.$floating() } })
        expect(b.$open()).toBe(false)
        expect(a.$open()).toBe(true)
    })

    it("should close the last opened modal on Esc, unless a text field has focus", () => {
        const a = modal("dialog")
        a.open()
        send("keydown", { key: "Escape", target: { nodeName: "INPUT" } })
        send("keydown", { key: "Escape", target: { isContentEditable: true, nodeName: "DIV" } })
        send("keydown", { key: "Enter", target: { nodeName: "DIV" } })
        expect(a.$open()).toBe(true)
        send("keydown", { key: "Escape", target: { nodeName: "DIV" } })
        expect(a.$open()).toBe(false)
        expect(stack).toEqual([])
    })

    it("should only listen to the document while a modal is open", () => {
        const a = modal("dialog")
        expect(listeners.get("mousedown")?.size ?? 0).toBe(0)
        a.open()
        expect(listeners.get("mousedown")?.size).toBe(1)
        expect(listeners.get("keydown")?.size).toBe(1)
        close(a)
        expect(listeners.get("mousedown")?.size).toBe(0)
        expect(listeners.get("keydown")?.size).toBe(0)
    })
})
