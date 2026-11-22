import type { ReadonlySignal, Signal } from "@monstermann/stdlib"
import { Memo, peek } from "@monstermann/stdlib"
import { useReactive } from "./useReactive"
import { useSignal } from "./useSignal"
import { useSignalEffect } from "./useSignalEffect"

export type TransitionStatus = "closed" | "closing" | "opened" | "opening"

export interface UseTransitionStatusOptions {
    closeDuration: number
    openDuration: number
}

export interface Transition {
    /** Opens with `$open(true)` and closes with `$open(false)`. `$status` follows `$open`. */
    readonly $open: Signal<boolean>
    readonly $status: ReadonlySignal<TransitionStatus>
}

export type UseTransitionStatus = [mounted: boolean, transition: Transition]

/**
 * `useTransitionStatus(options)`
 *
 * Tracks the status of something that opens and closes over time: `closed`, `opening`, `opened` or
 * `closing`.
 *
 * - `$open(true)` sets `mounted` right away and `opening` two frames later. The browser first
 *   paints the element closed, so the animation has a style to start from
 * - `$open(false)` sets `closing` right away. After `closeDuration`, it sets `closed` and
 *   `mounted: false`
 * - closing during `opening` switches to `closing`, and opening during `closing` switches back to
 *   `opening`
 * - `mounted` is the only React state. The component calling the hook renders when `mounted`
 *   changes. The animated element reads `$status`
 * - the transition follows `$open` while the component is mounted
 * - a new duration restarts the timer of the current step
 */
export function useTransitionStatus({ closeDuration, openDuration }: UseTransitionStatusOptions): UseTransitionStatus {
    const $open = useSignal(false)
    const $status = useSignal<TransitionStatus>("closed")
    const $mounted = Memo(() => $open() || $status() !== "closed")
    const transition: Transition = { $open, $status }

    useSignalEffect(() => {
        const open = $open()
        // The pending timer or frame of this run, cancelled when `$open` changes again or the component unmounts.
        let cancel: (() => void) | undefined

        const enter = (status: "closing" | "opening") => {
            cancel?.()
            $status(status)
            const timer = status === "opening"
                ? setTimeout(() => $status("opened"), openDuration)
                : setTimeout(() => $status("closed"), closeDuration)
            cancel = () => clearTimeout(timer)
        }

        // `peek`: the effect depends only on `$open`. The current status decides where the transition starts.
        peek(() => {
            const status = $status()
            if (!open) {
                // Still `closed`: `$open` went back to `false` before `afterPaint`, nothing to animate.
                if (status !== "closed") enter("closing")
                return
            }
            if (status === "closed") cancel = afterPaint(() => enter("opening"))
            else enter("opening")
        })

        return () => cancel?.()
    })

    return [useReactive($mounted), transition]
}

/**
 * Calls `callback` in the second frame from now. The first frame paints what was rendered before
 * the call.
 */
function afterPaint(callback: () => void): () => void {
    let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(callback)
    })
    return () => cancelAnimationFrame(frame)
}
