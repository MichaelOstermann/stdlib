/* eslint-disable @typescript-eslint/no-redeclare -- Transition is a type and what creates it */
import type { ReadonlySignal } from "@monstermann/stdlib"
import { Disposer, Memo, Signal, Untrack } from "@monstermann/stdlib"

export type TransitionStatus = "closed" | "closing" | "opened" | "opening"

export interface TransitionOptions {
    /** Milliseconds between `closing` and `closed`. */
    closeDuration: number
    /** Milliseconds between `close()` and `closing`. Defaults to 0. */
    closingDelay?: number
    /** Starts as `opened` instead of `closed`. */
    open?: boolean
    /** Milliseconds between `opening` and `opened`. */
    openDuration: number
}

/** The status of something that opens and closes over time. */
export interface Transition extends Disposer {
    /** True from `open()` until the status is `closed` again: whether the element should be rendered. */
    $mounted: Memo<boolean>
    /** The last request: true after `open()`, false after `close()`. The status follows it. */
    $open: ReadonlySignal<boolean>
    $status: ReadonlySignal<TransitionStatus>
    close: () => void
    open: () => void
    toggle: () => void
}

/**
 * `Transition(options)`
 *
 * Tracks the status of something that opens and closes over time: `closed`, `opening`, `opened`, `closing`.
 * It only holds the status. Turning the status into classes, attributes or styles is up to the caller.
 *
 * - `open()` sets `$mounted` right away and `opening` two frames later, so the element is painted in its closed state first and the browser has a style to animate from
 * - `close()` sets `closing` right away, or after `closingDelay`
 * - `close()` during `opening` switches to `closing`, and `open()` during `closing` switches back to `opening`
 * - a disposed transition keeps its last status and ignores `open()` and `close()`
 *
 * ```ts
 * const transition = Transition({ openDuration: 250, closeDuration: 200 });
 *
 * Effect(() => {
 *     if (!transition.$mounted()) return;
 *     const element = render();
 *     const effect = Effect(() => element.setAttribute("data-status", transition.$status()));
 *     return () => {
 *         effect.dispose();
 *         element.remove();
 *     };
 * });
 *
 * transition.open(); // two frames later "opening", 250ms later "opened"
 * transition.close(); // "closing", 200ms later "closed"
 * ```
 */
export function Transition(options: TransitionOptions): Transition {
    const $open = Signal(options.open ?? false)
    const $status = Signal<TransitionStatus>($open() ? "opened" : "closed")
    let cancel: (() => void) | undefined
    const disposer = Disposer(() => cancel?.())

    const enter = (status: "closing" | "opening"): void => {
        $status(status)
        cancel = status === "opening"
            ? delay(options.openDuration, () => $status("opened"))
            : delay(options.closeDuration, () => $status("closed"))
    }

    const set = (open: boolean): void => {
        if (disposer.disposed || Untrack($open) === open) return
        cancel?.()
        cancel = undefined
        $open(open)
        const status = Untrack($status)

        if (!open) {
            // Still `closed`: `open()` was cancelled before its two frames passed.
            if (status === "closed") return
            if (options.closingDelay) cancel = delay(options.closingDelay, () => enter("closing"))
            else enter("closing")
        }
        else if (status === "closed") {
            cancel = afterPaint(() => enter("opening"))
        }
        // `opening` is entered again when `close()` was cancelled during `closingDelay`, which restarts `openDuration`.
        else if (status !== "opened") {
            enter("opening")
        }
    }

    return Object.assign(disposer, {
        $mounted: Memo(() => $open() || $status() !== "closed"),
        $open,
        $status,
        close: () => set(false),
        open: () => set(true),
        toggle: () => set(!Untrack($open)),
    })
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
