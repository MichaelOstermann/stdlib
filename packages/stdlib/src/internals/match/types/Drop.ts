import type { IsUnion, Primitive, Simplify, UnionToTuple } from "type-fest"
import type { AnyArray } from "./AnyArray"
import type { CanMatch } from "./CanMatch"
import type { ComparedKeys } from "./ComparedKeys"
import type { Get } from "./Get"
import type { IsExact } from "./IsExact"
import type { IsUnit } from "./IsUnit"

/** What is left of the input after a pattern did not match. */
export type Drop<T, P> = IsUnion<P> extends true
    ? T
    : T extends unknown
        ? CanMatch<T, P> extends true
            // Tuples that can be of another length are still to be matched.
            ? P extends AnyArray
                ? [Get<T, "length">] extends [Get<P, "length">] ? DropOne<T, P> : T
                : DropOne<T, P>
            : T
        : never

type DropOne<T, P> = P extends Primitive
    ? IsUnit<P> extends true
        ? T extends P ? never : T
        : T
    : DropFields<T, P, ComparedKeys<P>>

// Not matching `{ a: 1, b: 2 }` means that `a` is something else, or that `a` is `1` and `b` is something else,
// which only needs the fields of the pattern to be taken apart, instead of every field of the input up front.
type DropFields<T, P, K> = IsExact<P> extends true
    // Nothing is compared by a tuple of wildcards, which matches all there is.
    ? [K] extends [never] ? never : DropKeys<T, P, UnionToTuple<K>>
    : T

type DropKeys<T, P, K> = K extends [infer Head, ...infer Tail]
    // Fields that are wider than the pattern (`number` and `1`) leave the input unchanged.
    ? [Get<T, Head>] extends [Exclude<Get<T, Head>, Get<P, Head>>]
            ? T
            : Refine<T, Head, Exclude<Get<T, Head>, Get<P, Head>>> | DropKeys<Refine<T, Head, Get<P, Head> & Get<T, Head>>, P, Tail>
    : never

type Refine<T, K, V> = [V] extends [never]
    ? never
    : T extends AnyArray
        ? { [Q in keyof T]: Q extends K ? V : T[Q] }
        : Simplify<Omit<T, K & keyof T> & { [Q in K & PropertyKey]: V }>
