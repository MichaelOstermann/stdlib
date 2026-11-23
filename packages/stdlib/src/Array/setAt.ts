import type { Updated } from "./internals"

/**
 * # setAt
 *
 * Sets the element at `index` to `value`. A negative `index` counts from the end. Returns `target`
 * itself when `index` is out of range, or when the element already is `value`.
 *
 * ## Example
 *
 * ```ts
 * Array.setAt([1, 2, 3], 1, 0); // [1, 0, 3]
 * Array.setAt([1, 2, 3], -1, 0); // [1, 2, 0]
 * ```
 */
export function setAt<T extends readonly unknown[]>(target: T, index: number, value: T[number]): Updated<T>
export function setAt(target: unknown[], index: number, value: unknown): unknown[] {
    const position = index < 0 ? target.length + index : index
    if (position < 0 || position >= target.length) return target
    if (Object.is(target[position], value)) return target
    return target.with(position, value)
}
