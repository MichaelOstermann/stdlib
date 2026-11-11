import type { IsUnion } from "type-fest"

// Results are passed along with the patterns, where literals are not widened the way they usually are.
// Something that is one of several literals has been given a type, and keeps it.
export type Widen<T> = IsUnion<T> extends true
    ? T
    : T extends string
        ? IsEnumMember<T> extends true
            ? T
            : string
        : T extends number
            ? IsEnumMember<T> extends true
                ? T
                : number
            : T extends boolean
                ? boolean
                : T extends bigint
                    ? bigint
                    : T

// Members of an enum do not accept the literal they stand for, and stay what they are.
type IsEnumMember<T extends number | string> = string extends T
    ? false
    : number extends T
        ? `${number}` extends `${T}`
            ? false
            : true
        : T extends number
            ? false
            : `${T}` extends T
                ? false
                : true
