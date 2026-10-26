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
    /** Opens with `$open(true)`, closes with `$open(false)`. `$status` follows it. */
    readonly $open: Signal<boolean>
    readonly $status: ReadonlySignal<TransitionStatus>
}

export type UseTransitionStatus = [mounted: boolean, transition: Transition]

/**
 * `useTransitionStatus(options)`
 *
 * The status of something that opens and closes over time: `closed`, `opening`, `opened`,
 * `closing`.
 *
 * - `$open(true)` sets `mounted` right away and `opening` two frames later, so the element is
 *   painted closed first and the browser has a style to animate from
 * - `$open(false)` sets `closing` right away, `closed` and `mounted: false` once `closeDuration`
 *   has passed
 * - closing during `opening` switches to `closing`, and opening during `closing` switches back to
 *   `opening`
 * - `mounted` is the only React state: the component calling the hook renders when it changes,
 *   `$status` is read by what animates
 * - the transition follows `$open` while the component is mounted, and a new duration restarts the
 *   timer of the current step
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
