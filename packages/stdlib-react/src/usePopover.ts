import type { Signal } from "@monstermann/stdlib"
import type { PlacementOptions } from "@monstermann/stdlib-web"
import type { Popover } from "./Popover"
import { Placement } from "@monstermann/stdlib-web"
import { useAnchoredModal } from "./internals/useAnchoredModal"
import { useSignalEffect } from "./useSignalEffect"

export interface UsePopoverOptions extends PlacementOptions {
    /** The trigger of a tooltip on the same element, `triggerRef` of `useTooltip`. */
    $trigger?: Signal<Element | null>
    /** `200` by default. */
    closeDuration?: number
    /** For `Modals.onOpen` and `Modals.onClose`, or telemetry. Need not be unique. */
    name?: string
    /** `250` by default. */
    openDuration?: number
    /** `Placement.popover` by default: centered above or below, on the side with more room. */
    placement?: Placement
}

/**
 * - `mounted`: from opening until closed again, whether to render `<Popover>`. The component calling the hook renders again when this changes.
 * - `triggerRef`: `popover.$trigger`, as its own binding: React Compiler skips a component that passes `popover.$trigger` as `ref`.
 * - `popover`: a new one only when the trigger, the placement or the name changes.
 */
export type UsePopover = [mounted: boolean, triggerRef: Signal<Element | null>, popover: Popover]

/**
 * `usePopover(options?)`
 *
 * Something next to an element that a click on it opens: a menu, a date picker, a form. Rendered by `<Popover>`.
 *
 * - a click on the trigger opens and closes the popover
 * - closes on a click outside of it and its trigger, on Esc, and when another popover opens
 * - follows the trigger when it moves
 * - `aria-expanded` on the trigger is whether the popover is open, for styling the trigger with it: `aria-expanded:bg-gray-100`
 * - the trigger is only a ref: the listeners are added to the element, there are no props to merge; an element with a tooltip too passes `$trigger`
 * - `mounted` is the only React state: the component calling the hook renders when the popover mounts and unmounts, `useReactive(popover.$open)` is whether it is open
 * - the listeners and effects are there while the component is mounted, and follow changes of the options
 *
 * ```tsx
 * function DueDate() {
 *     const [mounted, triggerRef, popover] = usePopover();
 *
 *     return (
 *         <>
 *             <button ref={triggerRef}>Due date</button>
 *             {mounted && <Popover popover={popover}><Calendar /></Popover>}
 *         </>
 *     );
 * }
 *
 * // With a tooltip on the same button:
 * const [tooltipMounted, triggerRef, tooltip] = useTooltip();
 * const [popoverMounted, , popover] = usePopover({ $trigger: triggerRef });
 * ```
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
