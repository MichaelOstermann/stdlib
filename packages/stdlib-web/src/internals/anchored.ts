import type { ReadonlySignal } from "@monstermann/stdlib"
import type { Placement, PlacementPosition } from "../Placement"
import type { Rect } from "../Rect"
import type { TransitionStatus } from "../Transition"
import { Disposer, Effect, Memo, Signal, Untrack } from "@monstermann/stdlib"
import { observeRect } from "../DOM/observeRect"
import { observeSize } from "../DOM/observeSize"
import { onAncestorScroll } from "../DOM/onAncestorScroll"
import { add } from "../Modals/add"
import { Transition } from "../Transition"

export interface AnchoredOptions {
    /** Passed to the placement, `4` by default. */
    anchorGap?: number
    /** Passed to the placement, `10` by default. */
    boundaryGap?: number
    closeDuration?: number
    /** For `Modals.onOpen` and `Modals.onClose`, or telemetry. Need not be unique. */
    name?: string
    openDuration?: number
    placement?: Placement
}

/** What a popover and a tooltip have in common: a modal next to an anchor. */
export interface Anchored<K extends string> extends Disposer {
    /** What the modal is placed next to: an element, which is then also its trigger, or a rect, like the point of a mouse event. */
    readonly $anchor: Signal<Element | Rect | null>
    /** The element that is positioned. */
    readonly $floating: Signal<HTMLElement | null>
    readonly $mounted: Memo<boolean>
    readonly $open: ReadonlySignal<boolean>
    /** Where to put `$floating`, measured while mounted. `undefined` while not mounted or while an element is missing. */
    readonly $position: Memo<PlacementPosition | undefined>
    readonly $status: ReadonlySignal<TransitionStatus>
    /** The anchor while it is an element, for `Modals`. */
    readonly $trigger: Memo<Element | null>
    readonly kind: K
    readonly name: string | undefined
    readonly close: () => void
    readonly open: () => void
    readonly toggle: () => void
}

export function anchored<K extends "popover" | "tooltip">(kind: K, options: AnchoredOptions & {
    closeDuration: number
    closeOnScroll: boolean
    delay: number
    openDuration: number
    placement: Placement
}): Anchored<K> {
    const { anchorGap, boundaryGap, placement } = options
    const transition = Transition({ closeDuration: options.closeDuration, openDuration: options.openDuration })
    const $anchor = Signal<Element | Rect | null>(null)
    const $floating = Signal<HTMLElement | null>(null)

    const $trigger = Memo(() => {
        const anchor = $anchor()
        return anchor && isElement(anchor) ? anchor : null
    })

    const $position = Memo(() => {
        if (!transition.$mounted()) return undefined
        const anchor = $anchor()
        const floating = $floating()
        if (!anchor || !floating) return undefined
        return placement({
            anchor: isElement(anchor) ? observeRect(anchor)() : anchor,
            boundary: observeSize(window)(),
            floating: observeSize(floating)(),
        }, { anchorGap, boundaryGap })
    })

    // `open()` waits for `delay`, a `close()` in the meantime cancels it.
    let timer: ReturnType<typeof setTimeout> | undefined
    const cancel = (): void => clearTimeout(timer)
    const open = (): void => {
        cancel()
        if (options.delay > 0) timer = setTimeout(transition.open, options.delay)
        else transition.open()
    }
    const close = (): void => {
        cancel()
        transition.close()
    }

    const disposer = Disposer(cancel)
    disposer.onDispose(transition)

    if (options.closeOnScroll) {
        disposer.onDispose(Effect(() => {
            const trigger = $trigger()
            return transition.$open() && trigger ? onAncestorScroll(trigger, close) : undefined
        }))
    }

    const result = Object.assign(disposer, {
        $anchor,
        $floating,
        $mounted: transition.$mounted,
        $open: transition.$open,
        $position,
        $status: transition.$status,
        $trigger,
        close,
        kind,
        name: options.name,
        open,
        toggle: () => Untrack(transition.$open) ? close() : open(),
    })
    disposer.onDispose(add(result))
    return result
}

function isElement(anchor: Element | Rect): anchor is Element {
    return "getBoundingClientRect" in anchor
}
