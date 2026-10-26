import { setOwn } from "../internals/objects"

/**
 * # indexBy
 *
 * ```ts
 * Object.indexBy(items, key)
 * ```
 *
 * Creates an object of `items` by what `key` returns for each, like `Object.groupBy` for keys that
 * occur once. When a key occurs more than once, the last item wins.
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
    for (const item of items) setOwn(result, key(item, index++), item)
    return result
}
