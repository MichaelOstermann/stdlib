import type { Primitive } from "type-fest"
import type { DropAll } from "./DropAll"
import type { Guarded } from "./Guarded"
import type { MatchError } from "./MatchError"
import type { Narrow } from "./Narrow"
import type { Next } from "./Next"
import type { Patterns } from "./Patterns"
import type { Remember } from "./Remember"
import type { Unguarded } from "./Unguarded"
import type { ValidFor } from "./ValidFor"
import type { Widen } from "./Widen"

export interface Matcher<
    Input,
    Output = never,
    Bound = unknown,
    Seen = never,
> {
    case: [Input] extends [never]
        ? MatchError<"Match is exhaustive">
        : <const P extends Patterns<Extract<Input, Primitive>>, O extends Bound>(
            ...args: [...patterns: P, result: ValidFor<Input, Seen, P, O>]
        ) => Matcher<DropAll<Input, P>, Next<Output, Bound, Widen<O>>, Bound, Remember<Seen, P>>

    cond: [Input] extends [never]
        ? MatchError<"Match is exhaustive">
        : <F extends (value: Input) => unknown, O extends Bound>(
            predicate: F,
            result: O,
        ) => Matcher<Unguarded<Input, F>, Next<Output, Bound, O>, Bound, Seen>

    onCase: [Input] extends [never]
        ? MatchError<"Match is exhaustive">
        : <const P extends Patterns<Extract<Input, Primitive>>, O extends Bound>(
            ...args: [...patterns: P, fn: ValidFor<Input, Seen, P, (value: Readonly<Narrow<Input, P[number]>>) => O>]
        ) => Matcher<DropAll<Input, P>, Next<Output, Bound, O>, Bound, Remember<Seen, P>>

    onCond: [Input] extends [never]
        ? MatchError<"Match is exhaustive">
        : <F extends (value: Input) => unknown, O extends Bound>(
            predicate: F,
            fn: (value: Readonly<Guarded<Input, F>>) => O,
        ) => Matcher<Unguarded<Input, F>, Next<Output, Bound, O>, Bound, Seen>

    onShape: [Input] extends [never]
        ? MatchError<"Match is exhaustive">
        : <const P extends Patterns<Exclude<Input, Primitive>>, O extends Bound>(
            ...args: [...patterns: P, fn: ValidFor<Input, Seen, P, (value: Readonly<Narrow<Input, P[number]>>) => O>]
        ) => Matcher<DropAll<Input, P>, Next<Output, Bound, O>, Bound, Remember<Seen, P>>

    returnType: [Output] extends [never]
        ? <O>() => Matcher<Input, O, O, Seen>
        : MatchError<"Calling `.returnType<T>()` is only allowed directly after `match(...)`">

    shape: [Input] extends [never]
        ? MatchError<"Match is exhaustive">
        : <const P extends Patterns<Exclude<Input, Primitive>>, O extends Bound>(
            ...args: [...patterns: P, result: ValidFor<Input, Seen, P, O>]
        ) => Matcher<DropAll<Input, P>, Next<Output, Bound, Widen<O>>, Bound, Remember<Seen, P>>

    unwrap: [Input] extends [never]
        ? () => Output
        : MatchError<Input>

    unwrapOr: [Input] extends [never]
        ? MatchError<"Match is exhaustive">
        : <O extends Bound>(value: O) => Next<Output, Bound, O>

    unwrapOrElse: [Input] extends [never]
        ? MatchError<"Match is exhaustive">
        : <O extends Bound>(fn: (value: Readonly<Input>) => O) => Next<Output, Bound, O>
}
