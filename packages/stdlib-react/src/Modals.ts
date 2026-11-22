import type { ReadonlyEmitter, ReadonlySignal, Signal } from "@monstermann/stdlib"
import type { PlacementPosition } from "@monstermann/stdlib-web"
import type { TransitionStatus } from "./useTransitionStatus"
import { Emitter } from "@monstermann/stdlib"
import { DOM } from "@monstermann/stdlib-web"

/** Something that opens over the page. A click outside or Esc closes the modal. */
export interface Modal {
    /** The element of the modal. Clicks inside it do not close the modal. */
    readonly $floating: Signal<Element | null>
    /** Whether the modal is open. The stack closes it by setting this to `false`. */
    readonly $open: Signal<boolean>
    /** Where to put `$floating` next to its trigger. Dialogs have none. */
    readonly $position?: ReadonlySignal<PlacementPosition | undefined>
    readonly $status: ReadonlySignal<TransitionStatus>
    /**
     * The element that opens and closes the modal, such as a button. Clicks on the trigger do not
     * close the modal through the stack. The trigger handles its own clicks.
     */
    readonly $trigger: Signal<Element | null>
    /**
     * Clicks and Esc ignore tooltips. Tooltips close when anything opens. Opening a popover or a
     * dialog closes the open popovers.
     */
    readonly kind: "dialog" | "popover" | "tooltip"
    /**
     * A name to tell modals apart in `Modals.onOpen`, `Modals.onClose` or telemetry. Need not be
     * unique.
     */
    readonly name?: string
}

const modals: Modal[] = []
const opened = Emitter<Modal>()
const closed = Emitter<Modal>()
let stopListening: (() => void) | undefined

/** The open modals, in the order they opened. */
const stack: readonly Modal[] = modals

/** Emits each modal that is put on the stack. */
const onOpen: ReadonlyEmitter<Modal> = opened

/** Emits each modal that is taken off the stack. */
const onClose: ReadonlyEmitter<Modal> = closed

/**
 * # open
 *
 * Puts a modal that opened on the stack. The stack only tracks the modal. To open the modal, call
 * `$open(true)`. `useTooltip` and the other hooks call `Modals.open`, so app code does not.
 *
 * - a click outside of the last opened modal closes that modal, unless the click is on its trigger
 * - Esc closes the last opened modal, unless a text field has focus
 * - opening anything closes the open tooltips
 * - opening a popover or a dialog closes the open popovers. A menu item that opens a dialog closes
 *   its menu
 * - tooltips are on the stack, but clicks and Esc go past them
 * - the stack closes a modal by taking the modal off, then calling `$open(false)`
 * - the listeners on `document` are only there while a modal is open
 * - opening a modal that is already on the stack does nothing
 * - closing a modal that is not on the stack does nothing
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
 * Takes a modal off the stack when the modal closes or is gone. The stack only tracks the modal. To
 * close the modal, call `$open(false)`.
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

/** Tooltips close when anything opens. Popovers close when a popover or a dialog opens. */
function closesOnOpen(open: Modal, opening: Modal): boolean {
    if (open.kind === "tooltip") return true
    return open.kind === "popover" && opening.kind !== "tooltip"
}

function dismiss(modal: Modal): void {
    close(modal)
    modal.$open(false)
}

/** Returns the modal that clicks and Esc go to: the last opened modal that is not a tooltip. */
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
