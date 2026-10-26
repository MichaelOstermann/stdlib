import type { ReadonlySignal, Signal } from "@monstermann/stdlib"
import type { Placement, PlacementOptions, PlacementPosition } from "@monstermann/stdlib-web"
import type { Modal } from "../Modals"
import type { TransitionStatus } from "../useTransitionStatus"
import { Memo } from "@monstermann/stdlib"
import { DOM, Rect } from "@monstermann/stdlib-web"
import { useSignal } from "../useSignal"
import { useSignalEffect } from "../useSignalEffect"
import { useTransitionStatus } from "../useTransitionStatus"
import { useModalStack } from "./useModalStack"

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

/**
 * What `useTooltip` and `usePopover` share: the transition, the elements, the position, and the
 * place on the stack while open and rendered.
 */
export function useAnchoredModal<K extends "popover" | "tooltip">(kind: K, options: AnchoredModalOptions): [mounted: boolean, modal: AnchoredModal<K>] {
    const { anchorGap, boundaryGap, closeDuration, name, openDuration, placement } = options
    const [mounted, { $open, $status }] = useTransitionStatus({ closeDuration, openDuration })
    const $floating = useSignal<Element | null>(null)
    const $ownTrigger = useSignal<Element | null>(null)
    const $trigger = options.$trigger ?? $ownTrigger
    const $anchor = useSignal(Rect.origin)
    const $boundary = useSignal(Rect.origin)
    const $floatingSize = useSignal(Rect.origin)

    // Measurements run only while the floating element is rendered. Each effect restarts only when its own element changes.
    useSignalEffect(() => {
        const trigger = $trigger()
        if (!$floating() || !trigger) return
        return DOM.observePosition(trigger, $anchor)
    })
    useSignalEffect(() => {
        if (!$floating()) return
        return DOM.observeSize(window, $boundary)
    })
    useSignalEffect(() => {
        const floating = $floating()
        if (!floating) return
        return DOM.observeSize(floating, $floatingSize)
    })

    const $position = Memo(() => {
        if (!$floating() || !$trigger()) return undefined
        return placement({
            anchor: $anchor(),
            boundary: $boundary(),
            floating: $floatingSize(),
        }, { anchorGap, boundaryGap })
    })

    // The stack identifies modals by object identity. React Compiler keeps this object until the trigger, the placement or the name changes.
    const modal: AnchoredModal<K> = {
        $floating,
        $open,
        $position,
        $status,
        $trigger,
        kind,
        name,
    }

    useModalStack(modal)

    return [mounted, modal]
}
