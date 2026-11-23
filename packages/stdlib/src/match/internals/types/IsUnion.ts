// Taken from type-fest@6.0.3, MIT License, Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
import type { IsEqual } from "./IsEqual"

export type IsUnion<T> = [T] extends [never] ? false : IsUnionOf<T>

// A union compares unequal to at least one of its members, so the result is `boolean`.
type IsUnionOf<T, Whole = T> = (T extends unknown ? IsEqual<Whole, T> extends true ? false : true : never) extends infer Result
    ? boolean extends Result
        ? true
        : Result
    : never
