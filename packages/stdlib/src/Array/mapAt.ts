import type { Updated } from "../internals/types"

/**
 * # mapAt
 *
 * ```ts
 * Array.mapAt(target, index, map)
 * ```
 *
 * Applies `map` to the element at `index`, a negative `index` counts from the end. Returns `target`
 * itself when `index` is out of range, or when `map` returned the element unchanged.
 *
 * ## Example
 *
 * ```ts
 * Array.mapAt([1, 2, 3], 1, x => x * 10); // [1, 20, 3]
 * Array.mapAt([1, 2, 3], -1, x => x * 10); // [1, 2, 30]
 * ```
 */
export function mapAt<T extends readonly unknown[]>(target: T, index: number, map: (value: T[number], index: number, target: T) => T[number]): Updated<T>
export function mapAt(target: unknown[], index: number, map: (value: unknown, index: number, target: unknown[]) => unknown): unknown[] {
    const position = index < 0 ? target.length + index : index
    if (position < 0 || position >= target.length) return target
    const value = map(target[position], position, target)
    if (Object.is(target[position], value)) return target
    return target.with(position, value)
}
