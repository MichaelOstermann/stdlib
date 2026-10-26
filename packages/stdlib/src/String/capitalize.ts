/**
 * # capitalize
 *
 * ```ts
 * function String.capitalize<T extends string>(
 *     target: T,
 * ): Capitalize<T>
 * ```
 *
 * Capitalizes the first letter of `target` string.
 *
 * ## Example
 *
 * ```ts
 * String.capitalize("hello world"); // "Hello world"
 * String.capitalize("hello"); // "Hello"
 * ```
 */
export function capitalize<T extends string>(target: T): Capitalize<T> {
    return (target.charAt(0).toUpperCase() + target.slice(1)) as Capitalize<T>
}
