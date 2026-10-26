import type { Updated } from "../internals/types"

/**
 * # uniqueBy
 *
 * ```ts
 * Array.uniqueBy(target, by)
 * ```
 *
 * Removes the elements that `by` returns the same value for as for an earlier one, the first
 * occurrence stays. Returns `target` itself when there are no duplicates.
 *
 * ## Example
 *
 * ```ts
 * Array.uniqueBy(tasks, task => task.id);
 * Array.uniqueBy(["a", "A", "b"], text => text.toLowerCase()); // ["a", "b"]
 * ```
 */
export function uniqueBy<T extends readonly unknown[]>(target: T, by: (value: T[number], index: number, target: T) => unknown): Updated<T>
export function uniqueBy(target: unknown[], by: (value: unknown, index: number, target: unknown[]) => unknown): unknown[] {
    const keys = new Set<unknown>()
    for (let i = 0; i < target.length; i++) {
        const key = by(target[i], i, target)
        if (!keys.has(key)) {
            keys.add(key)
            continue
        }

        // The first duplicate, everything before it is kept unchanged.
        const result = target.slice(0, i)
        let length = i
        for (let j = i + 1; j < target.length; j++) {
            const key = by(target[j], j, target)
            if (keys.has(key)) continue
            keys.add(key)
            result[length++] = target[j]
        }
        result.length = length
        return result
    }
    return target
}
