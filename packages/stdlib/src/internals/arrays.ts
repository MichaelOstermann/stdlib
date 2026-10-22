type Predicate = (value: any, index: number, target: any) => boolean
type Mapper = (value: any, index: number, target: any) => unknown

/** The position of the first element that satisfies `predicate`, or of the last one. */
export function indexWhere(target: unknown[], predicate: Predicate, last: boolean): number {
    return last ? target.findLastIndex(predicate) : target.findIndex(predicate)
}

/** The position of the first occurrence of `value`, or of the last one. */
export function indexOf(target: unknown[], value: unknown, last: boolean): number {
    return last ? target.lastIndexOf(value) : target.indexOf(value)
}

/**
 * Tells whether something is one of `values`, like `indexOf` in that `NaN` is never found.
 * Returns nothing when there are no values.
 */
export function matcher(values: Iterable<unknown>): ((value: unknown) => boolean) | undefined {
    // A few values are found faster by looking through them than by building a set.
    if (Array.isArray(values) && values.length <= 4) {
        if (!values.length) return
        // eslint-disable-next-line no-self-compare
        return (value) => value === value && values.includes(value)
    }

    const set = new Set(values)
    set.delete(Number.NaN)
    if (!set.size) return
    return (value) => set.has(value)
}

export function setAt(target: unknown[], index: number, value: unknown): unknown[] {
    if (index === -1 || target[index] === value) return target
    return target.with(index, value)
}

export function removeAt(target: unknown[], index: number): unknown[] {
    if (index === -1) return target
    return target.toSpliced(index, 1)
}

/** Replaces every element that satisfies `predicate` with what `map` returns for it. */
export function mapWhere(target: unknown[], predicate: Predicate | undefined, map: Mapper): unknown[] {
    let result: unknown[] | undefined
    for (let i = 0; i < target.length; i++) {
        const prev = target[i]
        if (predicate && !predicate(prev, i, target)) continue
        const next = map(prev, i, target)
        if (prev === next) continue
        result ??= [...target]
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

/** What can be put in order with `<` and `>`. */
export type Comparable = bigint | boolean | Date | number | string

/**
 * Sorts by a key of each element, which is only asked for once. Elements of the same key stay in the order they are in, in both directions.
 * Returns `target` itself when it is in order already.
 */
export function sortByKeys<K>(target: unknown[], keys: K[], compare: (a: K, b: K) => number, options: { order?: "asc" | "desc" } | undefined): unknown[] {
    const direction = options?.order === "desc" ? -1 : 1
    const order = keys.map((_, index) => index).sort((a, b) => direction * compare(keys[a]!, keys[b]!) || a - b)
    if (order.every((from, to) => from === to)) return target

    return order.map((index) => target[index])
}
