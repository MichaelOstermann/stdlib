import type { Primitive, Simplify } from "type-fest"
import type { AnyArray } from "./AnyArray"
import type { CanMatch } from "./CanMatch"
import type { ComparedKeys } from "./ComparedKeys"
import type { Get } from "./Get"

/** The type a callback receives after one of the patterns matched. */
export type Narrow<T, P> = P extends unknown
    ? T extends unknown
        ? CanMatch<T, P> extends true
            ? NarrowOne<T, P>
            : never
        : never
    : never

type NarrowOne<T, P> = T extends Primitive
    ? P & T
    : T extends AnyArray
        ? { [K in keyof T]: K extends ComparedKeys<P> ? Get<P, K> & T[K] : T[K] }
        : Simplify<Omit<T, ComparedKeys<P> & keyof T> & { [K in ComparedKeys<P>]: Get<P, K> & Get<T, K> }>
