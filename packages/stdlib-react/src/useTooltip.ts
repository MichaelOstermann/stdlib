import type { Signal } from "@monstermann/stdlib"
import type { PlacementOptions } from "@monstermann/stdlib-web"
import type { Tooltip } from "./Tooltip"
import { DOM, Placement } from "@monstermann/stdlib-web"
import { useAnchoredModal } from "./internals/useAnchoredModal"
import { useSignalEffect } from "./useSignalEffect"

export interface UseTooltipOptions extends PlacementOptions {
    /** The trigger of a popover on the same element: the `triggerRef` of `usePopover`. */
    $trigger?: Signal<Element | null>
    /** `200` by default. */
    closeDuration?: number
    /** Milliseconds the pointer rests on the trigger before the tooltip opens. `600` by default. */
    delay?: number
    /** A name for `Modals.onOpen`, `Modals.onClose` or telemetry. Need not be unique. */
    name?: string
    /** `200` by default. */
    openDuration?: number
    /** `Placement.tooltip` by default: below, or above when below does not fit. */
    placement?: Placement
}

/**
 * - `mounted`: whether to render `<Tooltip>`. True from opening until fully closed. The component
 *   calling the hook renders again when `mounted` changes.
 * - `triggerRef`: `tooltip.$trigger` in its own variable. React Compiler skips a component that
 *   passes `tooltip.$trigger` as `ref`.
 * - `tooltip`: changes only when the trigger, the placement or the name changes.
 */
export type UseTooltip = [mounted: boolean, triggerRef: Signal<Element | null>, tooltip: Tooltip]

/**
 * `useTooltip(options?)`
 *
 * Creates a tooltip: a short text next to an element. The tooltip opens after the pointer rests on
 * the element. `<Tooltip>` renders it.
 *
 * - opens when the pointer rests on the trigger for `delay`, or on focus
 * - closes when the pointer leaves, or on blur
 * - a click on the trigger closes the tooltip until the pointer leaves
 * - closes when something around the trigger scrolls, or when any other modal opens
 * - clicks and Esc ignore the tooltip
 * - the trigger is only a ref. The listeners go on the element, so there are no props to merge
 * - an element that also has a popover passes `$trigger`
 * - `mounted` is the only React state. The component calling the hook renders when the tooltip
 *   mounts and unmounts
 * - the listeners and effects live while the component is mounted. They follow changes of the
 *   options
 */
export function useTooltip(options: UseTooltipOptions = {}): UseTooltip {
    const { closeDuration = 200, delay = 600, openDuration = 200, placement = Placement.tooltip, ...rest } = options
    const [mounted, tooltip] = useAnchoredModal("tooltip", { ...rest, closeDuration, openDuration, placement })
    const { $open, $trigger } = tooltip

    // Listeners on the trigger, removed when the trigger changes or unmounts.
    useSignalEffect(() => {
        const trigger = $trigger()
        if (!trigger) return
        const controller = new AbortController()
        const { signal } = controller
        let timer: ReturnType<typeof setTimeout> | undefined
        let clicked = false

        // Every mouse move restarts the delay, so the tooltip opens only once the pointer rests.
        const open = (): void => {
            if (clicked) return
            clearTimeout(timer)
            timer = setTimeout(() => $open(true), delay)
        }
        const close = (): void => {
            clearTimeout(timer)
            $open(false)
        }

        trigger.addEventListener("mousemove", open, { signal })
        trigger.addEventListener("mouseleave", () => {
            clicked = false
            close()
        }, { signal })
        trigger.addEventListener("focus", open, { signal })
        trigger.addEventListener("blur", close, { signal })
        // A click closes the tooltip until the pointer leaves.
        trigger.addEventListener("click", () => {
            clicked = true
            close()
        }, { signal })

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    })

    // Closes when something around the trigger scrolls.
    useSignalEffect(() => {
        const trigger = $trigger()
        return trigger && $open() ? DOM.onAncestorScroll(trigger, () => $open(false)) : undefined
    })

    return [mounted, $trigger, tooltip]
}
