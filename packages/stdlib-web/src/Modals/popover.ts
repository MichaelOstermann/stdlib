import type { PopoverModal, PopoverModalOptions } from "."
import { anchored } from "../internals/anchored"
import { Placement } from "../Placement"

/**
 * # popover
 *
 * ```ts
 * function Modals.popover(options?: PopoverModalOptions): PopoverModal
 * ```
 *
 * A modal next to an anchor: a menu below a button, a context menu at the mouse.
 * It holds a `Transition`, measures and places itself while mounted, and is on the stack of `Modals` while open.
 *
 * - `$anchor` is an element, which then also opens and closes it, or a rect
 * - `$position` is where to put `$floating`, `Placement.popover` by default
 * - opening it closes the other popovers and the tooltips, a click outside or Esc closes it
 * - 250ms to open and 200ms to close by default
 *
 * ## Example
 *
 * ```ts
 * const popover = Modals.popover({ name: "project-menu" });
 * popover.$anchor(button);
 * popover.$floating(element);
 * popover.toggle();
 *
 * // A context menu, at the mouse:
 * element.addEventListener("contextmenu", (event) => {
 *     popover.$anchor({ left: event.clientX, top: event.clientY, width: 0, height: 0 });
 *     popover.open();
 * });
 * ```
 */
export function popover(options: PopoverModalOptions = {}): PopoverModal {
    return anchored("popover", {
        ...options,
        closeDuration: options.closeDuration ?? 200,
        closeOnScroll: false,
        delay: 0,
        openDuration: options.openDuration ?? 250,
        placement: options.placement ?? Placement.popover,
    })
}
