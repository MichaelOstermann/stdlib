/* eslint-disable @typescript-eslint/no-redeclare -- Untrack is a type and what it describes */
import { pauseTracking, resumeTracking, untrack } from "./internals/reactivity"

export interface Untrack {
    /** Calls `fn`, what it reads is not depended on. */
    <T>(fn: () => T): T
    /** Ends what has been started with `Untrack.start`. */
    end: () => void
    /** Stops depending on what is read until `Untrack.end`, for when there is no function to wrap. */
    start: () => void
}

/**
 * `Untrack(fn)`
 *
 * Reads without depending on what is read: a memo or an effect does not run again when a signal changes that it only read inside of `fn`.
 * A signal is a function that reads, so it can be passed as it is.
 *
 * ```ts
 * Untrack($count); // The value of $count.
 * Untrack(() => $a() + $b());
 *
 * Untrack.start();
 * try {
 *     $count();
 * }
 * finally {
 *     Untrack.end();
 * }
 * ```
 */
export const Untrack: Untrack = Object.assign(<T>(fn: () => T): T => untrack(fn), {
    end: resumeTracking,
    start: pauseTracking,
})
