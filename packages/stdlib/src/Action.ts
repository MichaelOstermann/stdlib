import { endBatch, pauseTracking, resumeTracking, startBatch } from "./internals/reactivity"

/**
 * `Action(handler)`
 *
 * Returns `handler` as a batched and untracked function. Effects run once the function is done. An
 * effect or memo that calls the function does not depend on the signals it reads. Use it for a
 * named operation that changes several signals at once and can be called from anywhere.
 *
 * - arguments and the return value are passed through unchanged
 * - only what happens until the first `await` is batched, like with `batch`
 *
 * ```ts
 * const moveTask = Action((id: string, sectionId: string) => {
 *     $tasks(tasks => Object.mapProp(tasks, id, task => ({ ...task, sectionId })));
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
