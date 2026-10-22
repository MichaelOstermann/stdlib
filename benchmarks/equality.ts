import { bench } from "./bench"

// Telling whether an element changed while mapping 1000 items, with === and with Object.is.

function withStrictEquals<T>(target: T[], fn: (value: T) => T): T[] {
    let copy: T[] | undefined
    for (let i = 0; i < target.length; i++) {
        const before = target[i]!
        const after = fn(before)
        if (before === after) continue
        copy ??= [...target]
        copy[i] = after
    }
    return copy ?? target
}

function withObjectIs<T>(target: T[], fn: (value: T) => T): T[] {
    let copy: T[] | undefined
    for (let i = 0; i < target.length; i++) {
        const before = target[i]!
        const after = fn(before)
        if (Object.is(before, after)) continue
        copy ??= [...target]
        copy[i] = after
    }
    return copy ?? target
}

const unchanged = <T>(value: T): T => value
const numbers = Array.from({ length: 1000 }, (_, i) => i)
const objects = Array.from({ length: 1000 }, (_, i) => ({ id: i }))

bench("numbers, ===", numbers, (items) => withStrictEquals(items, unchanged))
bench("numbers, Object.is", numbers, (items) => withObjectIs(items, unchanged))
bench("objects, ===", objects, (items) => withStrictEquals(items, unchanged))
bench("objects, Object.is", objects, (items) => withObjectIs(items, unchanged))
