import type { Signal } from "@monstermann/stdlib"
import type { PlacementOptions } from "@monstermann/stdlib-web"
import type { Popover } from "./Popover"
import { Placement } from "@monstermann/stdlib-web"
import { useAnchoredModal } from "./internals/useAnchoredModal"
import { useSignalEffect } from "./useSignalEffect"

export interface UsePopoverOptions extends PlacementOptions {
    /** The trigger of a tooltip on the same element: the `triggerRef` of `useTooltip`. */
    $trigger?: Signal<Element | null>
    /** `200` by default. */
    closeDuration?: number
    /** A name for `Modals.onOpen`, `Modals.onClose` or telemetry. Need not be unique. */
    name?: string
    /** `250` by default. */
    openDuration?: number
    /** `Placement.popover` by default: centered above or below, on the side with more room. */
    placement?: Placement
}

/**
 * - `mounted`: whether to render `<Popover>`. True from opening until fully closed. The component
 *   calling the hook renders again when `mounted` changes.
 * - `triggerRef`: `popover.$trigger` in its own variable. React Compiler skips a component that
 *   passes `popover.$trigger` as `ref`.
 * - `popover`: changes only when the trigger, the placement or the name changes.
 */
export type UsePopover = [mounted: boolean, triggerRef: Signal<Element | null>, popover: Popover]

/**
 * `usePopover(options?)`
 *
 * Creates a popover: a menu, a date picker or a form next to an element. A click on the element
 * opens the popover. `<Popover>` renders it.
 *
 * - a click on the trigger opens and closes the popover
 * - closes on a click outside the popover and its trigger, on Esc, and when another popover opens
 * - follows the trigger when it moves
 * - the trigger has `aria-expanded` while the popover is open. Style the trigger with
 *   `aria-expanded:bg-gray-100`
 * - the trigger is only a ref. The listeners go on the element, so there are no props to merge
 * - an element that also has a tooltip passes `$trigger`
 * - `mounted` is the only React state. The component calling the hook renders when the popover
 *   mounts and unmounts. `useReactive(popover.$open)` tells whether the popover is open
 * - the listeners and effects live while the component is mounted. They follow changes of the
 *   options
 */
export function usePopover(options: UsePopoverOptions = {}): UsePopover {
    const { closeDuration = 200, openDuration = 250, placement = Placement.popover, ...rest } = options
    const [mounted, popover] = useAnchoredModal("popover", { ...rest, closeDuration, openDuration, placement })
    const { $open, $trigger } = popover

    // A click on the trigger opens and closes the popover. The stack ignores clicks on the trigger.
    useSignalEffect(() => {
        const trigger = $trigger()
        if (!trigger) return
        const controller = new AbortController()
        trigger.addEventListener("click", () => $open((open) => !open), { signal: controller.signal })
        return () => controller.abort()
    })

    useSignalEffect(() => {
        const trigger = $trigger()
        if (!trigger) return
        trigger.setAttribute("aria-expanded", String($open()))
        return () => trigger.removeAttribute("aria-expanded")
    })

    return [mounted, $trigger, popover]
}
