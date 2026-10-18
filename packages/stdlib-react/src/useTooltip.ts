import type { Signal } from "@monstermann/stdlib"
import type { PlacementOptions } from "@monstermann/stdlib-web"
import type { Tooltip } from "./Tooltip"
import { Timer } from "@monstermann/stdlib"
import { DOM, Placement } from "@monstermann/stdlib-web"
import { useAnchoredModal } from "./internals/useAnchoredModal"
import { useCreateEffect } from "./internals/useCreateEffect"

export interface UseTooltipOptions extends PlacementOptions {
    /** The trigger of a popover on the same element, `triggerRef` of `usePopover`. */
    $trigger?: Signal<Element | null>
    /** `200` by default. */
    closeDuration?: number
    /** Milliseconds the pointer rests on the trigger before the tooltip opens, `600` by default. */
    delay?: number
    /** For `Modals.onOpen` and `Modals.onClose`, or telemetry. Need not be unique. */
    name?: string
    /** `200` by default. */
    openDuration?: number
    /** `Placement.tooltip` by default: below, above when it does not fit. */
    placement?: Placement
}

/**
 * - `mounted`: from opening until closed again, whether to render `<Tooltip>`. The component calling the hook renders again when this changes.
 * - `triggerRef`: `tooltip.$trigger`, as its own binding: React Compiler skips a component that passes `tooltip.$trigger` as `ref`.
 * - `tooltip`: a new one only when the trigger, the placement or the name changes.
 */
export type UseTooltip = [mounted: boolean, triggerRef: Signal<Element | null>, tooltip: Tooltip]

/**
 * `useTooltip(options?)`
 *
 * A short text next to an element, after the pointer rests on it. Rendered by `<Tooltip>`.
 *
 * - opens once the pointer rests on the trigger for `delay`, or on focus, and closes when the pointer leaves or on blur
 * - a click on the trigger closes the tooltip until the pointer leaves
 * - closes when something around the trigger scrolls, or when any other modal opens; clicks and Esc go past it
 * - the trigger is only a ref: the listeners are added to the element, there are no props to merge; an element with a popover too passes `$trigger`
 * - `mounted` is the only React state: the component calling the hook renders when the tooltip mounts and unmounts
 * - the listeners and effects are there while the component is mounted, and follow changes of the options
 *
 * ```tsx
 * function SearchButton() {
 *     const [mounted, triggerRef, tooltip] = useTooltip();
 *
 *     return (
 *         <>
 *             <button ref={triggerRef}>Search</button>
 *             {mounted && <Tooltip tooltip={tooltip}>Search tasks</Tooltip>}
 *         </>
 *     );
 * }
 * ```
 */
export function useTooltip(options: UseTooltipOptions = {}): UseTooltip {
    const { closeDuration = 200, delay = 600, openDuration = 200, placement = Placement.tooltip, ...rest } = options
    const [mounted, tooltip] = useAnchoredModal("tooltip", { ...rest, closeDuration, openDuration, placement })
    const { $open, $trigger } = tooltip

    // Listeners on the trigger, removed when it unmounts. `mouseleave` and `blur` are only there while the pointer is on the trigger and while it has focus.
    useCreateEffect(() => {
        const trigger = $trigger()
        if (!trigger) return
        const controller = new AbortController()
        const { signal } = controller
        let cancel: (() => void) | undefined
        let clicked = false
        let hovered = false

        // Every move starts the delay again, the tooltip opens once the pointer rests.
        const open = (): void => {
            if (clicked) return
            cancel?.()
            cancel = Timer.timeout(delay, () => $open(true))
        }
        const close = (): void => {
            cancel?.()
            $open(false)
        }

        trigger.addEventListener("mousemove", () => {
            if (!hovered) {
                hovered = true
                trigger.addEventListener("mouseleave", () => {
                    hovered = false
                    clicked = false
                    close()
                }, { once: true, signal })
            }
            open()
        }, { signal })
        trigger.addEventListener("focus", () => {
            trigger.addEventListener("blur", close, { once: true, signal })
            open()
        }, { signal })
        // A click closes the tooltip until the pointer leaves.
        trigger.addEventListener("click", () => {
            clicked = true
            close()
        }, { signal })

        return () => {
            cancel?.()
            controller.abort()
        }
    })

    // Closes when something around the trigger scrolls.
    useCreateEffect(() => {
        const trigger = $trigger()
        return trigger && $open() ? DOM.onAncestorScroll(trigger, () => $open(false)) : undefined
    })

    return [mounted, $trigger, tooltip]
}
