import { endBatch, pauseTracking, resumeTracking, startBatch } from "./internals/reactivity"

/**
 * `Action(handler)`
 *
 * Returns `handler` as a function that is batched and untracked: effects run once it is done, and an effect or memo that calls it does not depend on the signals it reads.
 * Use it for a named operation that changes several signals at once and can be called from anywhere.
 *
 * - arguments and the return value are passed through unchanged
 * - only what happens until the first `await` is batched, like with `Batch`
 *
 * ```ts
 * const moveTask = Action((id: string, sectionId: string) => {
 *     $tasks(tasks => Object.set(tasks, id, { ...tasks[id], sectionId }));
 *     $selected(id);
 * });
 *
 * moveTask("a", "b"); // Effects that read $tasks and $selected run once.
 * ```
 */
export function Action<T extends (...args: any[]) => unknown>(handler: T): T {
    return ((...args) => {
        startBatch()
        pauseTracking()
        try {
            return handler(...args)
        }
        finally {
            resumeTracking()
            endBatch()
        }
    }) as T
}
