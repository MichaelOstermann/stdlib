import type { IsEqual } from "./IsEqual"
import type { MatchError } from "./MatchError"
import type { Narrow } from "./Narrow"

export type ValidFor<Input, Seen, P, T> = [Problems<Input, Seen, P>] extends [never] ? T : MatchError<Problems<Input, Seen, P>>

type Problems<Input, Seen, P> = P extends readonly [infer Head, ...infer Tail]
    ? [Problem<Input, Seen, Head>] extends [never]
        ? Problems<Input, Seen, Tail>
        : Problem<Input, Seen, Head>
    : never

type Problem<Input, Seen, P> = [Narrow<Input, P>] extends [never]
    ? "Pattern can never match"
    : IsSeen<P, Seen> extends true
        ? "Pattern has been matched already"
        : never

type IsSeen<P, Seen> = true extends (Seen extends unknown ? IsEqual<P, Seen> : never) ? true : false
