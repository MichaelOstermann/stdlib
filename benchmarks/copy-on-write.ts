import { bench } from "./bench"

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

const unchanged = (value: number): number => value
const changeFirst = (value: number): number => value === 0 ? -1 : value
const changeAll = (value: number): number => value + 1

const ten = Array.from({ length: 10 }, (_, i) => i)
const thousand = Array.from({ length: 1000 }, (_, i) => i)

bench("10 items, nothing changed, copy first", ten, (items) => copyFirst(items, unchanged))
bench("10 items, nothing changed, copy on write", ten, (items) => copyOnWrite(items, unchanged))
bench("10 items, everything changed, copy first", ten, (items) => copyFirst(items, changeAll))
bench("10 items, everything changed, copy on write", ten, (items) => copyOnWrite(items, changeAll))

bench("1000 items, nothing changed, copy first", thousand, (items) => copyFirst(items, unchanged))
bench("1000 items, nothing changed, copy on write", thousand, (items) => copyOnWrite(items, unchanged))
bench("1000 items, first item changed, copy first", thousand, (items) => copyFirst(items, changeFirst))
bench("1000 items, first item changed, copy on write", thousand, (items) => copyOnWrite(items, changeFirst))
bench("1000 items, everything changed, copy first", thousand, (items) => copyFirst(items, changeAll))
bench("1000 items, everything changed, copy on write", thousand, (items) => copyOnWrite(items, changeAll))
