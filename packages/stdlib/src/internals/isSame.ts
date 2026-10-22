/**
 * Whether replacing `a` with `b` changes nothing: like `===`, except that `NaN` is the same as `NaN`.
 * Not `Object.is`, which is considerably slower where this is called for every element.
 */
export function isSame(a: unknown, b: unknown): boolean {
    // eslint-disable-next-line no-self-compare
    return a === b || (a !== a && b !== b)
}
