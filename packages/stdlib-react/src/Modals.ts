import type { Memo, ReadonlyEmitter, ReadonlySignal, Signal } from "@monstermann/stdlib"
import type { PlacementPosition } from "@monstermann/stdlib-web"
import type { TransitionStatus } from "./useTransitionStatus"
import { Emitter } from "@monstermann/stdlib"
import { DOM } from "@monstermann/stdlib-web"

/** Something that opens over the page and is closed by a click outside of it or by Esc. */
export interface Modal {
    /** The element of the modal. Clicks inside it do not close the modal. */
    readonly $floating: Signal<Element | null>
    /** Whether the modal is open. The stack closes it by setting this to `false`. */
    readonly $open: Signal<boolean>
    /** Where to put `$floating` next to its trigger. Dialogs have none. */
    readonly $position?: Memo<PlacementPosition | undefined>
    readonly $status: ReadonlySignal<TransitionStatus>
    /** The element that opens and closes the modal, a button for example. Clicks on it do not close the modal, the element handles them itself. */
    readonly $trigger: Signal<Element | null>
    /** Tooltips are left alone by clicks and Esc and close when anything opens. Opening a popover or a dialog closes the open popovers. */
    readonly kind: "dialog" | "popover" | "tooltip"
    /** For telling modals apart in `Modals.onOpen` and `Modals.onClose`, or in telemetry. Need not be unique. */
    readonly name?: string
}

const modals: Modal[] = []
const opened = Emitter<Modal>()
const closed = Emitter<Modal>()
let stopListening: (() => void) | undefined

/** The open modals, in the order they opened. */
const stack: readonly Modal[] = modals

/** Sends a modal when it is put on the stack. */
const onOpen: ReadonlyEmitter<Modal> = opened

/** Sends a modal when it is taken off the stack. */
const onClose: ReadonlyEmitter<Modal> = closed

/**
 * # open
 *
 * ```ts
 * function Modals.open(modal: Modal): void
 * ```
 *
 * Puts a modal that opened on the stack. It only tracks the modal, opening it is `$open(true)`. Done by `useTooltip` and the other hooks, not by the code that uses them.
 *
 * - a click outside of the last opened modal closes it, unless it is on its trigger
 * - Esc closes the last opened modal, unless a text field has focus
 * - opening anything closes the open tooltips, opening a popover or a dialog closes the open popovers: a menu item that opens a dialog closes its menu
 * - tooltips are on the stack, but clicks and Esc go past them
 * - the stack closes a modal with `$open(false)`, after taking it off
 * - the listeners on `document` are only there while a modal is open
 * - opening a modal that is on the stack already does nothing, and neither does closing one that is not
 *
 * ## Example
 *
 * ```ts
 * Modals.onOpen((modal) => console.log("open", modal.name));
 *
 * // Done by the hooks: on the stack while open and rendered.
 * Effect(() => {
 *     if (!modal.$open() || !modal.$floating()) return;
 *     Modals.open(modal);
 *     return () => Modals.close(modal);
 * });
 * ```
 */
function open(modal: Modal): void {
    if (modals.includes(modal)) return
    for (const other of [...modals]) {
        if (closesOnOpen(other, modal)) dismiss(other)
    }
    modals.push(modal)
    stopListening ??= listen()
    opened(modal)
}

/**
 * # close
 *
 * ```ts
 * function Modals.close(modal: Modal): void
 * ```
 *
 * Takes a modal off the stack, when it closes or is gone. It only tracks the modal, closing it is `$open(false)`.
 */
function close(modal: Modal): void {
    const index = modals.lastIndexOf(modal)
    if (index === -1) return
    modals.splice(index, 1)
    if (!modals.length) {
        stopListening?.()
        stopListening = undefined
    }
    closed(modal)
}

/** Tooltips close when anything opens, popovers when a popover or a dialog opens. */
function closesOnOpen(open: Modal, opening: Modal): boolean {
    if (open.kind === "tooltip") return true
    return open.kind === "popover" && opening.kind !== "tooltip"
}

function dismiss(modal: Modal): void {
    close(modal)
    modal.$open(false)
}

/** The modal that clicks and Esc go to: the last one that opened, tooltips aside. */
function top(): Modal | undefined {
    return modals.findLast((modal) => modal.kind !== "tooltip")
}

function listen(): () => void {
    const controller = new AbortController()
    const { signal } = controller

    document.addEventListener("mousedown", (event) => {
        const modal = top()
        const target = event.target as Node | null
        if (!modal || !target) return
        if (modal.$floating()?.contains(target)) return
        if (modal.$trigger()?.contains(target)) return
        dismiss(modal)
    }, { capture: true, signal })

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return
        if (DOM.isEditable(event.target)) return
        const modal = top()
        if (modal) dismiss(modal)
    }, { signal })

    return () => controller.abort()
}

export const Modals = {
    close,
    onClose,
    onOpen,
    open,
    stack,
}
