import { setOwn } from "./internals"

/**
 * # indexBy
 *
 * Creates an object of `items`, keyed by what `key` returns for each item. Works like
 * `Object.groupBy` for unique keys. When a key repeats, the last item wins.
 *
 * ## Example
 *
 * ```ts
 * Object.indexBy(tasks, task => task.id); // { a: taskA, b: taskB }
 * ```
 */
export function indexBy<T, K extends PropertyKey>(items: Iterable<T>, key: (item: T, index: number) => K): Partial<Record<K, T>> {
    const result: Partial<Record<K, T>> = {}
    let index = 0
    for (const item of items) {
        const itemKey = key(item, index++)
        // Assigned, `defineProperty` for every key takes many times as long.
        if (itemKey === "__proto__") setOwn(result, itemKey, item)
        else result[itemKey] = item
    }
    return result
}
