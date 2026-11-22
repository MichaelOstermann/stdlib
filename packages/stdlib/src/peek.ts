import { pauseTracking, resumeTracking, untrack } from "./internals/reactivity"

export interface Peek {
    /** Calls `fn` without tracking its reads. */
    <T>(fn: () => T): T
    /** Resumes tracking after `peek.start`. */
    end: () => void
    /** Stops tracking reads until `peek.end`. For code that cannot be wrapped in a function. */
    start: () => void
}

/**
 * `peek(fn)`
 *
 * Calls `fn` without tracking its reads. A memo or an effect does not run again when a signal
 * changes that was only read inside `fn`. A signal can be passed directly, since calling a signal
 * reads it.
 *
 * ```ts
 * peek($count); // The value of $count.
 * peek(() => $a() + $b());
 *
 * peek.start();
 * try {
 *     $count();
 * }
 * finally {
 *     peek.end();
 * }
 * ```
 */
export const peek: Peek = Object.assign(<T>(fn: () => T): T => untrack(fn), {
    end: resumeTracking,
    start: pauseTracking,
})
