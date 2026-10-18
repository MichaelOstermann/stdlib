import type { Memo, ReadonlySignal, Signal } from "@monstermann/stdlib"
import type { Placement, PlacementOptions, PlacementPosition } from "@monstermann/stdlib-web"
import type { Modal } from "../Modals"
import type { TransitionStatus } from "../useTransitionStatus"
import { DOM, Rect } from "@monstermann/stdlib-web"
import { Modals } from "../Modals"
import { useTransitionStatus } from "../useTransitionStatus"
import { useCreateEffect } from "./useCreateEffect"
import { useCreateMemo } from "./useCreateMemo"
import { useCreateSignal } from "./useCreateSignal"

/** A modal next to its trigger: a tooltip or a popover. */
export interface AnchoredModal<K extends "popover" | "tooltip"> extends Modal {
    readonly $position: Memo<PlacementPosition | undefined>
    readonly $status: ReadonlySignal<TransitionStatus>
    readonly kind: K
}

export interface AnchoredModalOptions extends PlacementOptions {
    /** The trigger of another tooltip or popover, for one element with both. */
    $trigger?: Signal<Element | null>
    closeDuration: number
    name?: string
    openDuration: number
    placement: Placement
}

/** What `useTooltip` and `usePopover` share: the transition, the elements, the position, and the place on the stack while open and rendered. */
export function useAnchoredModal<K extends "popover" | "tooltip">(kind: K, options: AnchoredModalOptions): [mounted: boolean, modal: AnchoredModal<K>] {
    const { anchorGap, boundaryGap, closeDuration, name, openDuration, placement } = options
    const [mounted, { $open, $status }] = useTransitionStatus({ closeDuration, openDuration })
    const $floating = useCreateSignal<Element | null>(null)
    const $ownTrigger = useCreateSignal<Element | null>(null)
    const $trigger = options.$trigger ?? $ownTrigger
    const $anchor = useCreateSignal(Rect.origin)
    const $boundary = useCreateSignal(Rect.origin)
    const $floatingSize = useCreateSignal(Rect.origin)

    // Measured only while the floating element is rendered, and each from the element it measures.
    useCreateEffect(() => {
        const trigger = $trigger()
        if (!$floating() || !trigger) return
        return DOM.observePosition(trigger, $anchor)
    })
    useCreateEffect(() => {
        if (!$floating()) return
        return DOM.observeSize(window, $boundary)
    })
    useCreateEffect(() => {
        const floating = $floating()
        if (!floating) return
        return DOM.observeSize(floating, $floatingSize)
    })

    const $position = useCreateMemo(() => {
        if (!$floating() || !$trigger()) return undefined
        return placement({
            anchor: $anchor(),
            boundary: $boundary(),
            floating: $floatingSize(),
        }, { anchorGap, boundaryGap })
    })

    // The stack knows the modal by this object, React Compiler keeps it until the trigger, the placement or the name changes.
    const modal: AnchoredModal<K> = {
        $floating,
        $open,
        $position,
        $status,
        $trigger,
        kind,
        name,
    }

    // On the stack while open and rendered: off it when it closes, when the floating element unmounts, and when the component does.
    useCreateEffect(() => {
        if (!$open() || !$floating()) return
        Modals.open(modal)
        return () => Modals.close(modal)
    })

    return [mounted, modal]
}
