import type { DialogModal, DialogModalOptions } from "."
import { Disposer, Signal } from "@monstermann/stdlib"
import { Transition } from "../Transition"
import { add } from "./add"

/**
 * # dialog
 *
 * ```ts
 * function Modals.dialog(options?: DialogModalOptions): DialogModal
 * ```
 *
 * A modal in the middle of the page. It holds a `Transition` and is on the stack of `Modals` while open.
 * Where it goes is up to CSS, it has no anchor.
 *
 * - a click outside of `$floating` or Esc closes it
 * - 250ms to open and 200ms to close by default
 *
 * ## Example
 *
 * ```ts
 * const dialog = Modals.dialog({ name: "note-create" });
 * dialog.$floating(element);
 * dialog.open();
 * ```
 */
export function dialog(options: DialogModalOptions = {}): DialogModal {
    const transition = Transition({ closeDuration: options.closeDuration ?? 200, openDuration: options.openDuration ?? 250 })
    const disposer = Disposer()
    disposer.onDispose(transition)

    const modal = Object.assign(disposer, {
        $floating: Signal<HTMLElement | null>(null),
        $mounted: transition.$mounted,
        $open: transition.$open,
        $status: transition.$status,
        close: transition.close,
        kind: "dialog" as const,
        name: options.name,
        open: transition.open,
        toggle: transition.toggle,
    })
    disposer.onDispose(add(modal))
    return modal
}
