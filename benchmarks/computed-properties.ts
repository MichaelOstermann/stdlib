import { bench } from "./bench"

// Two ways to copy an object with one property changed, a computed property and spread then assign, in a function that sees one shape, and in one that sees four.

function spreadThenAssign<T extends object>(target: T, key: keyof T, value: unknown): T {
    const copy = { ...target }
    copy[key] = value as T[keyof T]
    return copy
}

function computedProperty<T extends object>(target: T, key: keyof T, value: unknown): T {
    return { ...target, [key]: value }
}

// Separate copies of the functions for one shape, so they have not seen the others.
function spreadThenAssignOnce<T extends object>(target: T, key: keyof T, value: unknown): T {
    const copy = { ...target }
    copy[key] = value as T[keyof T]
    return copy
}

function computedPropertyOnce<T extends object>(target: T, key: keyof T, value: unknown): T {
    return { ...target, [key]: value }
}

const shapes = [{ a: 1, b: 2 }, { a: 1, c: 3 }, { a: 1, d: 4 }, { a: 1, e: 5 }] as const

bench("one shape, spread then assign", shapes, (shapes) => spreadThenAssignOnce(shapes[0], "a", 2))
bench("one shape, computed property", shapes, (shapes) => computedPropertyOnce(shapes[0], "a", 2))

bench("four shapes, spread then assign", shapes, (shapes) => [
    spreadThenAssign(shapes[0], "a", 2),
    spreadThenAssign(shapes[1], "a", 2),
    spreadThenAssign(shapes[2], "a", 2),
    spreadThenAssign(shapes[3], "a", 2),
])
bench("four shapes, computed property", shapes, (shapes) => [
    computedProperty(shapes[0], "a", 2),
    computedProperty(shapes[1], "a", 2),
    computedProperty(shapes[2], "a", 2),
    computedProperty(shapes[3], "a", 2),
])
