import type { Modal } from "../../src/Modals"
import type { TransitionStatus } from "../../src/Transition"
import { Batch, Signal } from "@monstermann/stdlib"
import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { add } from "../../src/Modals/add"
import { onClose, onOpen, stack } from "../../src/Modals/stack"

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
    delete globals.document
})

function fakeElement(): Element {
    const el = { contains: (node: unknown) => node === el || (node as { parent?: unknown })?.parent === el } as unknown as Element
    return el
}

function modal(kind: Modal["kind"], name?: string): Modal & { $status: Signal<TransitionStatus>, open: () => void } {
    const $open = Signal(false)
    const $status = Signal<TransitionStatus>("closed")
    const close = (): void => void Batch(() => [$open(false), $status("closing")])
    const open = (): void => void Batch(() => [$open(true), $status("opening")])
    const floating = fakeElement()
    const trigger = fakeElement()
    const result = { $open, $status, close, kind, name, open, $floating: () => floating, $trigger: () => trigger }
    disposers.push(add(result).dispose)
    return result
}

function send(type: string, event: { key?: string, target?: unknown }): void {
    for (const listener of listeners.get(type) ?? []) listener(event)
}

describe("Modals", () => {
    it("should keep the open modals in the order they opened, from open() until close()", () => {
        const a = modal("dialog")
        const b = modal("dialog")
        expect(stack).toEqual([])
        a.open()
        b.open()
        expect(stack).toEqual([a, b])
        a.$status("opened")
        expect(stack).toEqual([a, b])
        a.close()
        expect(stack).toEqual([b])
    })

    it("should send onOpen and onClose with the modal", () => {
        const events: string[] = []
        disposers.push(onOpen(modal => events.push(`open ${modal.name}`)))
        disposers.push(onClose(modal => events.push(`close ${modal.name}`)))
        const a = modal("dialog", "a")
        a.open()
        a.$status("opened")
        a.close()
        a.$status("closed")
        expect(events).toEqual(["open a", "close a"])
    })

    it("should send onClose when an open modal is removed", () => {
        const events: string[] = []
        disposers.push(onClose(modal => events.push(`close ${modal.name}`)))
        const remove = add({ $open: Signal(true), kind: "dialog", name: "a", $floating: () => null, close: () => {} })
        expect(stack).toHaveLength(1)
        remove.dispose()
        expect(stack).toHaveLength(0)
        expect(events).toEqual(["close a"])
    })

    it("should close the other popovers when a popover opens", () => {
        const a = modal("popover")
        const b = modal("dialog")
        const c = modal("popover")
        a.open()
        b.open()
        c.open()
        expect(a.$status()).toBe("closing")
        expect(stack).toEqual([b, c])
    })

    it("should close the open tooltips when anything opens", () => {
        const a = modal("tooltip")
        const b = modal("tooltip")
        const c = modal("dialog")
        a.open()
        b.open()
        expect(a.$status()).toBe("closing")
        c.open()
        expect(b.$status()).toBe("closing")
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
        expect(b.$status()).toBe("closing")
        expect(tooltip.$status()).toBe("opening")
        send("mousedown", { target: {} })
        expect(a.$status()).toBe("closing")
    })

    it("should leave clicks on the modal and on its trigger alone", () => {
        const a = modal("popover")
        a.open()
        send("mousedown", { target: { parent: a.$floating() } })
        send("mousedown", { target: a.$trigger!() })
        expect(a.$status()).toBe("opening")
    })

    it("should close the top modal on a click in a modal below it", () => {
        const a = modal("dialog")
        const b = modal("dialog")
        a.open()
        b.open()
        send("mousedown", { target: { parent: a.$floating() } })
        expect(b.$status()).toBe("closing")
        expect(a.$status()).toBe("opening")
    })

    it("should close the last opened modal on Esc, unless a text field has focus", () => {
        const a = modal("dialog")
        a.open()
        send("keydown", { key: "Escape", target: { nodeName: "INPUT" } })
        send("keydown", { key: "Escape", target: { isContentEditable: true, nodeName: "DIV" } })
        send("keydown", { key: "Enter", target: { nodeName: "DIV" } })
        expect(a.$status()).toBe("opening")
        send("keydown", { key: "Escape", target: { nodeName: "DIV" } })
        expect(a.$status()).toBe("closing")
    })

    it("should only listen to the document while a modal is open", () => {
        const a = modal("dialog")
        expect(listeners.get("mousedown")?.size ?? 0).toBe(0)
        a.open()
        expect(listeners.get("mousedown")?.size).toBe(1)
        expect(listeners.get("keydown")?.size).toBe(1)
        a.close()
        expect(listeners.get("mousedown")?.size).toBe(0)
        expect(listeners.get("keydown")?.size).toBe(0)
    })
})
