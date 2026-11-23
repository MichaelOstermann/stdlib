import type { AnyArray } from "./AnyArray"
import type { Primitive } from "./Primitive"
import type { Wildcard } from "./Wildcard"

/** Everything that can be matched against: primitives, shallow objects and tuples. */
export type Pattern<T> = T extends unknown
    ? T extends Primitive
        ? T
        : T extends AnyArray
            ? TuplePattern<T>
            : T extends AnyFunction
                ? never
                : ShapePattern<T>
    : never

// Arrays of unknown length can not be matched.
type TuplePattern<T extends AnyArray> = number extends T["length"]
    ? never
    : { readonly [K in keyof T]: Extract<T[K], Primitive> | Wildcard }

// Only fields that can hold primitives, with at least one of them.
// Optional fields are matched with `undefined`, which going through the fields of `T` itself would take away.
type ShapePattern<T> = AtLeastOne<{ readonly [K in PrimitiveKeys<T>]: Extract<T[K], Primitive> }>

type PrimitiveKeys<T> = { [K in keyof T]-?: [Extract<T[K], Primitive>] extends [never] ? never : K }[keyof T]

type AtLeastOne<T> = { [K in keyof T]: Partial<T> & Pick<T, K> }[keyof T]

type AnyFunction = (...args: any[]) => unknown
