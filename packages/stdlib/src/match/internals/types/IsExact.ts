// Whether a pattern always matches the same values: single literals, and wildcards that can not be anything else.
import type { Get } from "./Get"
import type { IsUnit } from "./IsUnit"
import type { PatternKeys } from "./PatternKeys"
import type { Primitive } from "./Primitive"
import type { Wildcard } from "./Wildcard"

export type IsExact<P> = [P] extends [Primitive]
    ? IsUnit<P>
    : false extends (PatternKeys<P> extends infer K ? K extends unknown ? IsExactAt<Get<P, K>> : never : never)
        ? false
        : true

type IsExactAt<T> = [T] extends [Wildcard] ? true : IsUnit<T>
