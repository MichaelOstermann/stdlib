import type { Pattern } from "./Pattern"

export type Patterns<T> = readonly [Pattern<T>, ...Pattern<T>[]]
