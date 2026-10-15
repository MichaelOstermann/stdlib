import type { Disposer, Memo, ReadonlySignal, Signal } from "@monstermann/stdlib"
import type { Anchored, AnchoredOptions } from "../internals/anchored"
import type { TransitionStatus } from "../Transition"
import { add } from "./add"
import { dialog } from "./dialog"
import { popover } from "./popover"
import { onClose, onOpen, stack } from "./stack"
import { tooltip } from "./tooltip"

/** Something that opens over the page and is closed by a click outside of it or by Esc. */
export interface Modal {
    /** The element of the modal: a click in it is not outside of it. */
    readonly $floating: () => Element | null
    /** Whether the modal is open, from `open()` until `close()`. It is on the stack while this is true. */
    readonly $open: () => boolean
    /** The element that opens and closes the modal: a click on it is left to the element. */
    readonly $trigger?: () => Element | null
    /** Called by the stack, on a click outside, on Esc, and when another modal closes this one. */
    readonly close: () => void
    /** Tooltips are left alone by clicks and Esc and close when anything opens. Opening a popover closes the other popovers. */
    readonly kind: "dialog" | "popover" | "tooltip"
    /** For telling modals apart in `Modals.onOpen` and `Modals.onClose`, or in telemetry. Need not be unique. */
    readonly name?: string
}

export interface PopoverModalOptions extends AnchoredOptions {}

export interface PopoverModal extends Anchored<"popover"> {}

export interface TooltipModalOptions extends AnchoredOptions {
    /** Milliseconds between `open()` and the tooltip opening, `600` by default. A `close()` in the meantime cancels it. */
    delay?: number
}

export interface TooltipModal extends Anchored<"tooltip"> {}

export interface DialogModalOptions {
    closeDuration?: number
    /** For `Modals.onOpen` and `Modals.onClose`, or telemetry. Need not be unique. */
    name?: string
    openDuration?: number
}

export interface DialogModal extends Disposer {
    /** The element of the dialog: a click outside of it closes the dialog. */
    readonly $floating: Signal<HTMLElement | null>
    readonly $mounted: Memo<boolean>
    readonly $open: ReadonlySignal<boolean>
    readonly $status: ReadonlySignal<TransitionStatus>
    readonly kind: "dialog"
    readonly name: string | undefined
    readonly close: () => void
    readonly open: () => void
    readonly toggle: () => void
}

export const Modals = {
    add,
    dialog,
    onClose,
    onOpen,
    popover,
    stack,
    tooltip,
}
