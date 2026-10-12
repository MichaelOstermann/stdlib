import { endBatch, pauseTracking, resumeTracking, startBatch } from "./internals/reactivity"

/**
 * `Action(handler)`
 *
 * Returns `handler` as a function that is batched and untracked: effects run once it is done, and what it reads is not depended on by what calls it.
 * It is what changes several signals at once, as something to name and to call from anywhere.
 *
 * - arguments and what it returns are passed along as they are
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
