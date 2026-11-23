// The keys of a pattern that are known to be compared: all fields of a shape, all positions of a tuple that can not be a wildcard.
import type { Get } from "./Get"
import type { PatternKeys } from "./PatternKeys"
import type { Wildcard } from "./Wildcard"

export type ComparedKeys<P> = { [K in PatternKeys<P>]: Wildcard extends Get<P, K> ? never : K }[PatternKeys<P>]
