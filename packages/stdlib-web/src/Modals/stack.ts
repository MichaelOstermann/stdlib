import type { ReadonlyEmitter } from "@monstermann/stdlib"
import type { Modal } from "."
import { Emitter } from "@monstermann/stdlib"

const modals: Modal[] = []
const opened = Emitter<Modal>()
const closed = Emitter<Modal>()
let stopListening: (() => void) | undefined

/** The open modals, in the order they opened. Open is while `$open` is true. */
export const stack: readonly Modal[] = modals

/** Sends a modal when it opens. */
export const onOpen: ReadonlyEmitter<Modal> = opened

/** Sends a modal when it closes, or when it is removed while open. */
export const onClose: ReadonlyEmitter<Modal> = closed

export function push(modal: Modal): void {
    if (modals.includes(modal)) return
    // Tooltips close when anything opens, popovers when another popover opens.
    for (const other of modals) {
        if (other.kind === "tooltip" || (other.kind === "popover" && modal.kind === "popover")) other.close()
    }
    modals.push(modal)
    stopListening ??= listen()
    opened(modal)
}

export function remove(modal: Modal): void {
    const index = modals.lastIndexOf(modal)
    if (index === -1) return
    modals.splice(index, 1)
    if (!modals.length) {
        stopListening?.()
        stopListening = undefined
    }
    closed(modal)
}

/** The modal that clicks and Esc go to: the last one that opened, tooltips aside. */
function top(): Modal | undefined {
    return modals.findLast(modal => modal.kind !== "tooltip")
}

function listen(): () => void {
    const controller = new AbortController()
    const { signal } = controller

    document.addEventListener("mousedown", (event) => {
        const modal = top()
        const target = event.target as Node | null
        if (!modal || !target) return
        if (modal.$floating()?.contains(target)) return
        if (modal.$trigger?.()?.contains(target)) return
        modal.close()
    }, { capture: true, signal })

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return
        // A text field uses Esc itself, to reset what was typed and to blur.
        const target = event.target as HTMLElement | null
        if (target?.nodeName === "INPUT" || target?.nodeName === "TEXTAREA" || target?.isContentEditable) return
        top()?.close()
    }, { signal })

    return () => controller.abort()
}
