import type { ReadonlySignal, Signal } from "@monstermann/stdlib"
import { peek } from "@monstermann/stdlib"
import { useState } from "react"
import { useCreateEffect } from "./internals/useCreateEffect"
import { useCreateMemo } from "./internals/useCreateMemo"
import { useCreateSignal } from "./internals/useCreateSignal"
import { useSignal } from "./useSignal"

export type TransitionStatus = "closed" | "closing" | "opened" | "opening"

export interface UseTransitionStatusOptions {
    closeDuration: number
    openDuration: number
}

export interface Transition {
    /** Opens with `$open(true)`, closes with `$open(false)`. `$status` follows it. */
    readonly $open: Signal<boolean>
    readonly $status: ReadonlySignal<TransitionStatus>
}

export type UseTransitionStatus = [mounted: boolean, transition: Transition]

/**
 * `useTransitionStatus(options)`
 *
 * The status of something that opens and closes over time: `closed`, `opening`, `opened`, `closing`.
 *
 * - `$open(true)` sets `mounted` right away and `opening` two frames later, so the element is painted closed first and the browser has a style to animate from
 * - `$open(false)` sets `closing` right away, `closed` and `mounted: false` once `closeDuration` has passed
 * - closing during `opening` switches to `closing`, and opening during `closing` switches back to `opening`
 * - `mounted` is the only React state: the component calling the hook renders when it changes, `$status` is read by what animates
 * - the transition follows `$open` while the component is mounted, a change of a duration starts the step in progress again with it
 *
 * ```tsx
 * function Fade({ children }: { children: ReactNode }) {
 *     const [mounted, transition] = useTransitionStatus({ openDuration: 250, closeDuration: 200 });
 *
 *     return (
 *         <>
 *             <button onClick={() => transition.$open(open => !open)}>Toggle</button>
 *             {mounted && <FadeElement $status={transition.$status}>{children}</FadeElement>}
 *         </>
 *     );
 * }
 *
 * function FadeElement({ $status, children }: { $status: ReadonlySignal<TransitionStatus>, children: ReactNode }) {
 *     return (
 *         <div data-status={$status()} className="opacity-0 transition-opacity duration-200 data-[status^=open]:opacity-100 data-[status^=open]:duration-250">
 *             {children}
 *         </div>
 *     );
 * }
 * ```
 */
export function useTransitionStatus({ closeDuration, openDuration }: UseTransitionStatusOptions): UseTransitionStatus {
    const $open = useCreateSignal(false)
    const $status = useCreateSignal<TransitionStatus>("closed")
    const $mounted = useCreateMemo(() => $open() || $status() !== "closed")
    const [transition] = useState<Transition>(() => ({ $open, $status }))

    useCreateEffect(() => {
        const open = $open()
        // The timer of this run of the effect, cancelled before the next change of `$open` and when the component unmounts.
        let cancel: (() => void) | undefined

        const enter = (status: "closing" | "opening") => {
            cancel?.()
            $status(status)
            cancel = status === "opening"
                ? delay(openDuration, () => $status("opened"))
                : delay(closeDuration, () => $status("closed"))
        }

        // Only `$open` is what this follows, the status is where it starts from.
        peek(() => {
            const status = $status()
            // Still `closed` when closing: opened and closed again within the two frames.
            if (!open) return void (status !== "closed" && enter("closing"))
            if (status === "closed") cancel = afterPaint(() => enter("opening"))
            else enter("opening")
        })

        return () => cancel?.()
    })

    return [useSignal($mounted), transition]
}

/** Calls `callback` in the second frame from now. The first frame paints what was rendered before the call. */
function afterPaint(callback: () => void): () => void {
    let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(callback)
    })
    return () => cancelAnimationFrame(frame)
}

function delay(ms: number, callback: () => void): () => void {
    const timeout = setTimeout(callback, ms)
    return () => clearTimeout(timeout)
}
