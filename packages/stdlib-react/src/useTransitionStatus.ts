import type { TransitionOptions } from "@monstermann/stdlib-web"
import { Transition } from "@monstermann/stdlib-web"
import { useEffect, useState } from "react"

export interface UseTransitionOptions extends Omit<TransitionOptions, "open"> {
    /** Whether a component that mounts with `open: true` starts as `closed` and animates in. Defaults to `true`. */
    animateMount?: boolean
    open: boolean
}

/**
 * `useTransition(options)`
 *
 * Creates a `Transition` that follows the `open` option and is disposed when the component unmounts.
 *
 * - the returned transition holds signals: only components that read `$status` or `$mounted` render again, the component calling this hook does not
 * - the durations and `closingDelay` are read once, when the transition is created
 *
 * ```tsx
 * function Fade({ children, show }: { children: ReactNode, show: boolean }) {
 *     const transition = useTransition({ open: show, openDuration: 250, closeDuration: 200 });
 *     if (!transition.$mounted()) return null;
 *
 *     return (
 *         <div
 *             data-status={transition.$status()}
 *             className="opacity-0 transition-opacity duration-200 data-[status^=open]:opacity-100 data-[status^=open]:duration-250"
 *         >
 *             {children}
 *         </div>
 *     );
 * }
 * ```
 */
export function useTransition(options: UseTransitionOptions): Transition {
    const create = (): Transition => Transition({
        closeDuration: options.closeDuration,
        closingDelay: options.closingDelay,
        open: options.open && options.animateMount === false,
        openDuration: options.openDuration,
    })
    const [transition, setTransition] = useState(create)

    useEffect(() => {
        // React runs effects twice during development, which leaves a disposed transition in state.
        if (transition.disposed) return setTransition(create())
        return transition.dispose
    }, [transition])

    useEffect(() => {
        if (options.open) transition.open()
        else transition.close()
    }, [transition, options.open])

    return transition
}
