import type { Primitive } from "type-fest"
import type { AnyArray } from "./AnyArray"
import type { ComparedKeys } from "./ComparedKeys"
import type { Get } from "./Get"

// Whether a member of the input could be matched by a pattern.
export type CanMatch<T, P> = 0 extends 1 & T
    // Anything.
    ? true
    : [P] extends [Primitive]
        ? [T] extends [Primitive] ? Overlaps<T, P> : false
        : [P] extends [AnyArray]
            ? [T] extends [AnyArray]
                ? Get<P, "length"> extends Get<T, "length"> ? FieldsMatch<T, P> : false
                : false
            : [T] extends [Primitive] ? false : FieldsMatch<T, P>

type FieldsMatch<T, P> = false extends { [K in ComparedKeys<P>]: Overlaps<Get<T, K>, Get<P, K>> }[ComparedKeys<P>]
    ? false
    : true

type Overlaps<T, U> = [T & U] extends [never] ? false : true
