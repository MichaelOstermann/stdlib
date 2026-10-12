/* eslint-disable @typescript-eslint/no-redeclare -- Batch is a type and what it describes */
import { batch, endBatch, isBatching, startBatch } from "./internals/reactivity"

export interface Batch {
    /** Calls `fn`, and runs the effects of everything it changed once it is done. */
    <T>(fn: () => T): T
    /** Ends a batch that has been started with `Batch.start`, the outermost one runs the effects. */
    end: () => void
    /** Whether a batch is going on. */
    isActive: () => boolean
    /** Starts a batch that lasts until `Batch.end`, for when there is no function to wrap. */
    start: () => void
}

/**
 * `Batch(fn)`
 *
 * Makes several changes count as one: effects run once `fn` is done, instead of after every signal that is written.
 * Batches can be nested, the outermost one runs the effects.
 *
 * - a signal that is back to the value it had before the batch updates nothing
 * - memos are up to date inside of a batch, only effects wait
 * - an `Emitter` batches while it calls its listeners, and a `Disposer` while it disposes
 *
 * ```ts
 * Batch(() => {
 *     $a(1);
 *     $b(1);
 * }); // Effects that read $a and $b run once.
 *
 * Batch.start();
 * try {
 *     $a(2);
 *     $b(2);
 * }
 * finally {
 *     Batch.end();
 * }
 *
 * Batch.isActive(); // false
 * ```
 */
export const Batch: Batch = Object.assign(<T>(fn: () => T): T => batch(fn), {
    end: endBatch,
    isActive: isBatching,
    start: startBatch,
})
