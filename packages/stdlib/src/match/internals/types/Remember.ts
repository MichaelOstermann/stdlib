// The input does not always tell what has been matched already: `"a"` out of `string` leaves `string`.
import type { IsExact } from "./IsExact"

export type Remember<Seen, P> = P extends readonly [infer Head, ...infer Tail]
    ? Remember<IsExact<Head> extends true ? Head | Seen : Seen, Tail>
    : Seen
