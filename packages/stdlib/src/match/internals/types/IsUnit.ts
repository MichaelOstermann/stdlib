// A single literal, as opposed to `string`, or a variable that is `"a" | "b"`: only those tell which values are left.
import type { IsLiteral } from "./IsLiteral"
import type { IsUnion } from "./IsUnion"

export type IsUnit<T> = IsUnion<T> extends true ? false : IsLiteral<T>
