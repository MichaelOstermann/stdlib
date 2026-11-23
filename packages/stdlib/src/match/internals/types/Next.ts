import type { Union } from "./Union"

export type Next<Output, Bound, O> = unknown extends Bound ? Union<Output, O> : Bound
