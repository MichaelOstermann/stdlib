import { endBatch, batch as run, startBatch } from "./internals/reactivity"

export interface Batch {
    /** Calls `fn`, and runs the effects of everything it changed once it is done. */
    <T>(fn: () => T): T
    /** Ends a batch that has been started with `batch.start`, the outermost one runs the effects. */
    end: () => void
    /** Starts a batch that lasts until `batch.end`, for when there is no function to wrap. */
    start: () => void
}

/**
 * `batch(fn)`
 *
 * Makes several changes count as one: effects run once `fn` is done, instead of after every signal that is written.
 * Batches can be nested, the outermost one runs the effects.
 *
 * ```ts
 * batch(() => {
 *     $a(1);
 *     $b(1);
 * }); // Effects that read $a and $b run once.
 *
 * batch.start();
 * try {
 *     $a(2);
 *     $b(2);
 * }
 * finally {
 *     batch.end();
 * }
 * ```
 */
export const batch: Batch = Object.assign(<T>(fn: () => T): T => run(fn), {
    end: endBatch,
    start: startBatch,
})
