/* eslint-disable @typescript-eslint/no-redeclare -- Untrack is a type and what it describes */
import { pauseTracking, resumeTracking, untrack } from "./internals/reactivity"

export interface Untrack {
    /** Calls `fn`, what it reads is not depended on. */
    <T>(fn: () => T): T
    /** Resumes tracking after `Untrack.start`. */
    end: () => void
    /** Stops tracking reads until `Untrack.end`. For code that can not be wrapped in a function. */
    start: () => void
}

/**
 * `Untrack(fn)`
 *
 * Calls `fn` without tracking its reads: a memo or an effect does not run again when a signal changes that was only read inside of `fn`.
 * A signal can be passed directly, since calling it reads it.
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
