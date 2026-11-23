type Predicate = (value: any, index: number, target: any) => boolean
type Mapper = (value: any, index: number, target: any) => unknown

/** Returns the index of the first element that satisfies `predicate`. With `last`, of the last. */
export function indexWhere(target: unknown[], predicate: Predicate, last: boolean): number {
    return last ? target.findLastIndex(predicate) : target.findIndex(predicate)
}

/** Returns the index of the first occurrence of `value`. With `last`, of the last occurrence. */
export function indexOf(target: unknown[], value: unknown, last: boolean): number {
    return last ? target.lastIndexOf(value) : target.indexOf(value)
}

/**
 * Returns a test for whether a value is one of `values`, `NaN` included, like a `Set`. Returns
 * `undefined` when `values` is empty.
 */
export function matcher(values: Iterable<unknown>): ((value: unknown) => boolean) | undefined {
    const set = new Set(values)
    if (!set.size) return
    return (value) => set.has(value)
}

export function setAt(target: unknown[], index: number, value: unknown): unknown[] {
    if (index === -1 || Object.is(target[index], value)) return target
    return target.with(index, value)
}

export function removeAt(target: unknown[], index: number): unknown[] {
    if (index === -1) return target
    return target.toSpliced(index, 1)
}

/** Replaces every element that satisfies `predicate` with the result of `map`. */
export function mapWhere(target: unknown[], predicate: Predicate | undefined, map: Mapper): unknown[] {
    let result: unknown[] | undefined
    for (let i = 0; i < target.length; i++) {
        const prev = target[i]
        if (predicate && !predicate(prev, i, target)) continue
        const next = map(prev, i, target)
        if (Object.is(prev, next)) continue
        result ??= target.slice()
        result[i] = next
    }
    return result ?? target
}

/** Removes every element that satisfies `predicate`. */
export function removeWhere(target: unknown[], predicate: Predicate): unknown[] {
    let i = 0
    while (i < target.length && !predicate(target[i], i, target)) i++
    if (i === target.length) return target

    // Everything before the first removal stays where it is.
    const result = target.slice(0, i)
    let length = i
    for (i++; i < target.length; i++) {
        const value = target[i]
        if (!predicate(value, i, target)) result[length++] = value
    }
    result.length = length
    return result
}

/** Values that `<` and `>` can order. */
export type Comparable = bigint | boolean | Date | number | string

/**
 * Sorts by a key of each element. The key is computed once per element. Elements with the same key
 * keep their order, in both directions. Returns `target` itself when `target` is already sorted.
 */
export function sortByKeys<K>(target: unknown[], keys: K[], compare: (a: K, b: K) => number, options: { order?: "asc" | "desc" } | undefined): unknown[] {
    const direction = options?.order === "desc" ? -1 : 1
    const order = keys.map((_, index) => index).sort((a, b) => direction * compare(keys[a]!, keys[b]!) || a - b)
    if (order.every((from, to) => from === to)) return target

    return order.map((index) => target[index])
}

/**
 * Mutable in, mutable out. Readonly in, readonly out. Without `U`, the elements keep their type.
 * Each member of a union of arrays is handled on its own.
 */
export type Updated<T extends readonly unknown[], U = never> = T extends unknown[]
    ? ([U] extends [never] ? T[number] : U)[]
    : readonly ([U] extends [never] ? T[number] : U)[]

/**
 * Several values. A string is rejected: a string is iterable, but never meant as a list of
 * characters.
 */
export type Values<T extends readonly unknown[], V extends Iterable<T[number]>> = V extends string ? never : V

/** The type a type guard narrows to. `T` for a plain predicate. */
export type Narrowed<P, T> = P extends (value: any, ...args: any[]) => value is infer U ? U : T

/**
 * The element type of the second list of a partition. For a type guard, `T` without the narrowed
 * type. Otherwise `T`.
 */
export type Excluded<P, T> = P extends (value: any, ...args: any[]) => value is infer U ? Exclude<T, U> : T
