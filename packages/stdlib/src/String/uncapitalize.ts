/**
 * # uncapitalize
 *
 * ```ts
 * function String.uncapitalize<T extends string>(
 *     target: T,
 * ): Uncapitalize<T>
 * ```
 *
 * Uncapitalizes the first letter of `target` string.
 *
 * ## Example
 *
 * ```ts
 * String.uncapitalize("Hello World"); // "hello World"
 * String.uncapitalize("Hello"); // "hello"
 * ```
 */
export function uncapitalize<T extends string>(target: T): Uncapitalize<T> {
    return (target.charAt(0).toLowerCase() + target.slice(1)) as Uncapitalize<T>
}
