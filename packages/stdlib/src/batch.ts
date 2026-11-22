import { endBatch, batch as run, startBatch } from "./internals/reactivity"

export interface Batch {
    /** Calls `fn`. Runs the effects of everything `fn` changed once `fn` is done. */
    <T>(fn: () => T): T
    /**
     * Ends a batch that `batch.start` started. The outermost batch runs the effects.
     */
    end: () => void
    /** Starts a batch that lasts until `batch.end`. Use it when there is no function to wrap. */
    start: () => void
}

/**
 * `batch(fn)`
 *
 * Makes several changes count as one. Effects run once `fn` is done, instead of after every signal
 * write. Batches can be nested. The outermost batch runs the effects.
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
