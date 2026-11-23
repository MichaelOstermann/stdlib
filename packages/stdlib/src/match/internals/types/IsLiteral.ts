// Taken from type-fest@6.0.3, MIT License, Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
import type { Primitive } from "./Primitive"

/**
 * `true` for a literal, `null`, `undefined`, and a member of a numeric enum. `boolean` for a union
 * of literals and wide types.
 */
export type IsLiteral<T> = 0 extends 1 & T
    ? false
    : [T] extends [never]
        ? false
        : IsLiteralOf<CollapseLiterals<UnwrapBrand<T>>>

type IsLiteralOf<T> =
    | (Extract<T, boolean> extends infer Booleans ? [Booleans] extends [never] ? never : boolean extends Booleans ? false : true : never)
    | (Exclude<T, boolean> extends infer Rest ? Rest extends null | undefined ? true : IsNonBooleanLiteral<Rest> : never)

type IsNonBooleanLiteral<T> = T extends number | bigint
    ? `${number}` extends `${T}`
        ? false
        : `${bigint}` extends `${T}`
            ? false
            : true
    : T extends string
        ? Record<never, never> extends Record<T, never>
            ? false
            : true
        : T extends symbol
            ? symbol extends T
                ? false
                : true
            : false

// `"a" | (string & {})` becomes `string`.
type CollapseLiterals<T> = T extends Primitive
    ? T extends infer Collapsed & {}
        ? Collapsed
        : T
    : T

// `string & { __brand: "Id" }` becomes `string`.
type UnwrapBrand<T> = T extends Primitive
    ? CollapseLiterals<T> extends infer Collapsed
        ? Collapsed extends infer Unbranded & Pick<Collapsed, Exclude<keyof Collapsed, PrimitiveKey>>
            ? Unbranded
            : Collapsed
        : never
    : T

type PrimitiveKey = keyof bigint | keyof boolean | keyof number | keyof string | keyof symbol
