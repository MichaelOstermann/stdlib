import type { TooltipModal, TooltipModalOptions } from "."
import { anchored } from "../internals/anchored"
import { Placement } from "../Placement"

/**
 * # tooltip
 *
 * ```ts
 * function Modals.tooltip(options?: TooltipModalOptions): TooltipModal
 * ```
 *
 * A short text next to an element, after the pointer rests on it.
 * Like `Modals.popover`, with a delay, and it closes when something around the anchor scrolls.
 *
 * - `open()` opens after `delay`, `close()` cancels that
 * - `$position` is where to put `$floating`, `Placement.tooltip` by default: below, above when it does not fit
 * - clicks and Esc go past it, and anything else opening closes it
 * - 200ms to open and to close by default
 *
 * ## Example
 *
 * ```ts
 * const tooltip = Modals.tooltip();
 * tooltip.$anchor(button);
 * tooltip.$floating(element);
 * button.addEventListener("mouseenter", tooltip.open);
 * button.addEventListener("mouseleave", tooltip.close);
 * ```
 */
export function tooltip(options: TooltipModalOptions = {}): TooltipModal {
    return anchored("tooltip", {
        ...options,
        closeDuration: options.closeDuration ?? 200,
        closeOnScroll: true,
        delay: options.delay ?? 600,
        openDuration: options.openDuration ?? 200,
        placement: options.placement ?? Placement.tooltip,
    })
}
