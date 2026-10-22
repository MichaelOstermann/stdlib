import { bench } from "./bench"

// Removing every element that is one of a few values from 100 items: by looking through the values, and with a Set built for it.

function withIncludes(target: number[], values: number[]): number[] {
    return target.filter((value) => !values.includes(value))
}

function withSet(target: number[], values: number[]): number[] {
    const set = new Set(values)
    return target.filter((value) => !set.has(value))
}

const items = Array.from({ length: 100 }, (_, i) => i)

bench("2 values, includes", [2, 50], (values) => withIncludes(items, values))
bench("2 values, Set", [2, 50], (values) => withSet(items, values))
bench("4 values, includes", [2, 30, 50, 70], (values) => withIncludes(items, values))
bench("4 values, Set", [2, 30, 50, 70], (values) => withSet(items, values))
bench("8 values, includes", [2, 10, 20, 30, 50, 60, 70, 80], (values) => withIncludes(items, values))
bench("8 values, Set", [2, 10, 20, 30, 50, 60, 70, 80], (values) => withSet(items, values))
bench("32 values, includes", Array.from({ length: 32 }, (_, i) => i * 3), (values) => withIncludes(items, values))
bench("32 values, Set", Array.from({ length: 32 }, (_, i) => i * 3), (values) => withSet(items, values))
