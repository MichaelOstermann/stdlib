import type { Memo, ReadonlySignal, Signal } from "@monstermann/stdlib"
import type { PlacementOptions, PlacementPosition } from "@monstermann/stdlib-web"
import type { Modal } from "./Modals"
import type { TransitionStatus } from "./useTransitionStatus"
import { DOM, Placement } from "@monstermann/stdlib-web"
import { useCreateEffect } from "./internals/useCreateEffect"
import { useCreateMemo } from "./internals/useCreateMemo"
import { useCreateSignal } from "./internals/useCreateSignal"
import { Modals } from "./Modals"
import { useTransitionStatus } from "./useTransitionStatus"

export interface UseTooltipOptions extends PlacementOptions {
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

export interface TooltipModal extends Modal {
    readonly $position: Memo<PlacementPosition | undefined>
    readonly $status: ReadonlySignal<TransitionStatus>
    readonly kind: "tooltip"
}

/**
 * - `mounted`: from opening until closed again, whether to render `<Tooltip>`. The component calling the hook renders again when this changes.
 * - `triggerRef`: `tooltip.$trigger`, as its own binding: React Compiler skips a component that passes `tooltip.$trigger` as `ref`.
 * - `tooltip`: a new one only when the placement or the name changes.
 */
export type UseTooltip = [mounted: boolean, triggerRef: Signal<Element | null>, tooltip: TooltipModal]

/**
 * `useTooltip(options?)`
 *
 * A short text next to an element, after the pointer rests on it. Rendered by `<Tooltip>`.
 *
 * - opens once the pointer rests on the trigger for `delay`, or on focus, and closes when the pointer leaves or on blur
 * - a click on the trigger closes the tooltip until the pointer leaves
 * - closes when something around the trigger scrolls, or when any other modal opens; clicks and Esc go past it
 * - the trigger is only a ref: the listeners are added to the element, there are no props to merge
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
    const { anchorGap, boundaryGap, closeDuration = 200, delay = 600, name, openDuration = 200, placement = Placement.tooltip } = options
    const [mounted, { $open, $status }] = useTransitionStatus({ closeDuration, openDuration })
    const $floating = useCreateSignal<Element | null>(null)
    const $trigger = useCreateSignal<Element | null>(null)

    const $position = useCreateMemo(() => {
        const floating = $floating()
        const trigger = $trigger()
        if (!floating || !trigger) return undefined
        return placement({
            anchor: DOM.observeRect(trigger)(),
            boundary: DOM.observeSize(window)(),
            floating: DOM.observeSize(floating)(),
        }, { anchorGap, boundaryGap })
    })

    // The stack knows the tooltip by this object, React Compiler keeps it until the placement or the name changes.
    const tooltip: TooltipModal = {
        $floating,
        $open,
        $position,
        $status,
        $trigger,
        kind: "tooltip",
        name,
    }

    // On the stack while open and rendered: off it when it closes, when `<Tooltip>` unmounts, and when the component does.
    useCreateEffect(() => {
        if (!$open() || !$floating()) return
        Modals.open(tooltip)
        return () => Modals.close(tooltip)
    })

    // Listeners on the trigger, removed when it unmounts. `mouseleave` and `blur` are only there while the pointer is on the trigger and while it has focus.
    useCreateEffect(() => {
        const trigger = $trigger()
        if (!trigger) return
        const controller = new AbortController()
        const { signal } = controller
        let timer: ReturnType<typeof setTimeout> | undefined
        let clicked = false
        let hovered = false

        // Every move starts the delay again, the tooltip opens once the pointer rests.
        const open = (): void => {
            if (clicked) return
            clearTimeout(timer)
            timer = setTimeout(() => $open(true), delay)
        }
        const close = (): void => {
            clearTimeout(timer)
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
            clearTimeout(timer)
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
