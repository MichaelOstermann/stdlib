import type { Modal } from "."
import { Disposer, Effect } from "@monstermann/stdlib"
import { push, remove } from "./stack"

/**
 * # add
 *
 * ```ts
 * function Modals.add(modal: Modal): Disposer
 * ```
 *
 * Puts a modal on the stack while `$open` is true.
 * Done by `Modals.popover`, `Modals.tooltip` and `Modals.dialog` themselves, not by the code that uses them.
 *
 * - a click outside of the last opened modal closes it, unless it is on the trigger of the modal
 * - Esc closes the last opened modal, unless a text field has focus
 * - opening anything closes the open tooltips, opening a popover closes the other popovers
 * - tooltips are on the stack, but clicks and Esc go past them
 * - the listeners on `document` are only there while a modal is open
 * - disposing removes the modal, `Modals.onClose` is sent if it was open
 *
 * ## Example
 *
 * ```ts
 * const transition = Transition({ openDuration: 250, closeDuration: 200 });
 * Modals.add({
 *     kind: "popover",
 *     name: "project-menu",
 *     $open: transition.$open,
 *     close: transition.close,
 *     $floating: () => floatingElement,
 *     $trigger: () => buttonElement,
 * });
 *
 * Modals.onOpen((modal) => console.log("open", modal.name));
 * transition.open(); // "open project-menu"
 * ```
 */
export function add(modal: Modal): Disposer {
    const effect = Effect(() => modal.$open() ? push(modal) : remove(modal))
    return Disposer(() => {
        effect.dispose()
        remove(modal)
    })
}
