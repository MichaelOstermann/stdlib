import type { Case } from "./measure"
import { measure } from "./measure"

// The two ways to map an array of the performance page: copy first, and copy on write.

function copyFirst<T>(target: T[], fn: (value: T) => T): T[] {
    let didChange = false
    const result = target.map((before) => {
        const after = fn(before)
        didChange ||= before !== after
        return after
    })
    return didChange ? result : target
}

function copyOnWrite<T>(target: T[], fn: (value: T) => T): T[] {
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

const cases: Record<string, Case> = {}
for (const size of [10, 1000]) {
    // Two equal arrays, taken in turns: with one, an engine may see that every call returns the same, and make it once.
    const inputs = [Array.from({ length: size }, (_, i) => i), Array.from({ length: size }, (_, i) => i)]
    const changes: Record<string, (value: number) => number> = {
        "everything changed": (value) => value + 1,
        "first item changed": (value) => value === 0 ? -1 : value,
        "last item changed": (value) => value === size - 1 ? -1 : value,
        "nothing changed": (value) => value,
    }
    for (const [change, fn] of Object.entries(changes)) {
        cases[`${size} items, ${change}, copy first`] = (calls) => {
            let result
            for (let i = 0; i < calls; i++) result = copyFirst(inputs[i & 1]!, fn)
            return result
        }
        cases[`${size} items, ${change}, copy on write`] = (calls) => {
            let result
            for (let i = 0; i < calls; i++) result = copyOnWrite(inputs[i & 1]!, fn)
            return result
        }
    }
}

measure(cases)
