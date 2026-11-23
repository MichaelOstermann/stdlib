import type { Drop } from "./Drop"

export type DropAll<T, P> = P extends readonly [infer Head, ...infer Tail]
    ? DropAll<Drop<T, Head>, Tail>
    : T
