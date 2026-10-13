/**
 * # chunk
 *
 * ```ts
 * Array.chunk(target, size)
 * ```
 *
 * Splits into arrays of `size` elements, the last one holds the remaining elements.
 *
 * ## Example
 *
 * ```ts
 * Array.chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
 * Array.chunk([], 2); // []
 * ```
 */
export function chunk<T extends readonly unknown[]>(target: T, size: number): T[number][][]
export function chunk(target: unknown[], size: number): unknown[][] {
    if (!(size >= 1)) throw new RangeError("Array.chunk: a size below 1 never gets through the array.")
    size = Math.floor(size)
    const result: unknown[][] = []
    for (let i = 0; i < target.length; i += size) result.push(target.slice(i, i + size))
    return result
}
