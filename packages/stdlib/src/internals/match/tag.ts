import type { IsLiteral } from "./types/IsLiteral"
import { throwUnmatched } from "./throwUnmatched"

/**
 * What a tag can be, each is handled by the key it is written as: `"a"`, `1` as `1`, `true` as
 * `true`.
 */
type Tag = boolean | number | string | null | undefined

/** The members of a union whose tag is written as `V`. */
type Tagged<T, K extends keyof T, V extends string> = T extends unknown ? V extends `${T[K] & Tag}` ? T : never : never

type Handlers<T, K extends keyof T> = { [V in `${T[K] & Tag}`]: (value: Tagged<T, K, V>) => unknown }

/** Rejects handlers whose key is neither a tag nor the `_` fallback. */
type Exact<T, K extends keyof T, H> = H & NoInfer<{ [V in keyof H as `${V & (number | string)}` extends `${T[K] & Tag}` | "_" ? never : V]: never }>

type Returned<H> = H[keyof H] extends infer F ? F extends (...args: never[]) => infer R ? R : never : never

/**
 * A key that is a literal in every member, `never` otherwise: a `string` in one, like the `name` of
 * a plain `Error`, leaves members that no handler can name, see `match(value).shape` for those.
 */
type Discriminant<T, K extends keyof T> = false extends (T[K] extends infer V ? V extends unknown ? IsLiteral<V> : never : never)
    ? never
    : K

export interface MatchTag {
    /**
     * `match.tag(value, key, handlers)`
     *
     * Matches a union by the property that tells its members apart, returning what the handler of
     * that member returns for it.
     *
     * - every member needs a handler, named like its tag
     * - `_` handles the ones that have none, and makes the others optional, the value is not
     *   narrowed for it
     * - throws for a tag that the types did not tell about, unless there is a `_`
     *
     * ```ts
     * type Shape =
     *     | { kind: "circle"; radius: number }
     *     | { kind: "square"; size: number }
     *     | { kind: "point" };
     *
     * const area = (shape: Shape) =>
     *     match.tag(shape, "kind", {
     *         circle: (circle) => Math.PI * circle.radius ** 2,
     *         square: (square) => square.size ** 2,
     *         point: () => 0,
     *     });
     *
     * const name = (shape: Shape) =>
     *     match.tag(shape, "kind", {
     *         point: () => "a point",
     *         _: (shape) => `a ${shape.kind}`,
     *     });
     * ```
     */
    <T, K extends keyof T, H extends Handlers<T, K>>(value: T, key: Discriminant<T, K>, handlers: Exact<T, K, H>): Returned<H>
    <T, K extends keyof T, H extends Partial<Handlers<T, K>> & { _: (value: T) => unknown }>(value: T, key: Discriminant<T, K>, handlers: Exact<T, K, H>): Returned<H>
}

type AnyHandlers = Record<string, ((value: unknown) => unknown) | undefined>

export const tag = function (value: Record<PropertyKey, unknown>, key: PropertyKey, handlers: AnyHandlers): unknown {
    const tag = value[key]
    // Nothing else is a tag: an object would be handled by what it turns into as a string.
    const name = typeof tag === "string"
        ? tag
        : typeof tag === "number" || typeof tag === "boolean" || tag == null ? String(tag) : undefined
    const handler = name !== undefined && Object.hasOwn(handlers, name) ? handlers[name] : handlers["_"]
    if (!handler) return throwUnmatched(value)
    return handler(value)
} as MatchTag
