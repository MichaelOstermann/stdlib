import type { JSON } from "./JSON"
import type { Simplify } from "./types"
import { isPlainObject } from "./Object/isPlainObject"
import { omit } from "./Object/omit"

/**
 * What went wrong, as plain data that survives `JSON.stringify`, unlike an `Error`: a `name` to
 * tell failures apart, a `message` for people, and `meta` for the rest. `cause` is the failure that
 * led to this one, `errors` the ones it is made of. A type of its own is a `Failure` when it has
 * these fields.
 *
 * ```ts
 * type TakenError = { name: "TakenError", message: string, meta: { email: string } }
 * ```
 */
export type Failure = {
    cause?: Failure
    errors?: Failure[]
    message: string
    meta?: JSON.Object
    name: string
    stack?: string
}

/** The fields of a `Failure` itself, the others of an object go into its `meta`. */
const FIELDS = new Set(["cause", "errors", "message", "meta", "name", "stack"])

/**
 * # from
 *
 * ```ts
 * Failure.from(value)
 * ```
 *
 * Turns anything that was thrown, or that something failed with, into a `Failure`:
 *
 * - A `Failure` comes back with the same fields
 * - An `Error` keeps its `name`, `message` and `stack`, its other fields that are JSON go into
 *   `meta`
 * - A plain object takes its `name` and `message`, its other fields that are JSON go into `meta`
 * - Anything else becomes the `message`
 *
 * The `cause` and the `errors` of an `AggregateError` are turned into failures the same way. Never
 * changes `value`, and never throws.
 *
 * ## Example
 *
 * ```ts
 * Failure.from("Not found"); // { name: "Error", message: "Not found" }
 * Failure.from({ name: "TakenError", message: "Already a member" }); // { name: "TakenError", message: string }
 *
 * try {
 *     await save();
 * } catch (thrown) {
 *     log(Failure.from(thrown));
 * }
 * ```
 */
function from<T extends { name?: N }, N extends string>(value: T): FailureOf<T>
function from<T>(value: T): FailureOf<T>
function from(value: unknown): Failure {
    return failureOf(value, new Set())
}

/**
 * What `from` gives back for `T`: a `Failure` with the fields of `T`, its other fields that are
 * JSON moved into `meta`.
 */
type FailureOf<T> = T extends Failure
    ? Exclude<keyof T, keyof Failure> extends never
        ? T
        : Simplify<Omit<T, Exclude<keyof T, keyof Failure> | "meta"> & MetaFieldOf<T>>
    : Failure

/**
 * `meta` when it has fields for sure, `meta?` when it may have some, and nothing when it has none.
 */
type MetaFieldOf<T> = Record<never, never> extends MetaOf<T>
    ? [keyof MetaOf<T>] extends [never]
        ? Record<never, never>
        : { meta?: MetaOf<T> }
    : { meta: MetaOf<T> }

/** The `meta` of `T`, with its other fields that are JSON added. */
type MetaOf<T> = Simplify<Omit<T extends { meta?: infer Meta } ? NonNullable<Meta> : Record<never, never>, keyof JSONFieldsOf<Omit<T, keyof Failure>>> & JSONFieldsOf<Omit<T, keyof Failure>>>

/** The fields of `T` that are JSON, and as optional the ones that are JSON when they are there. */
type JSONFieldsOf<T> = Simplify<
    & { [K in keyof T as T[K] extends JSON ? K : never]: T[K] }
    & { [K in keyof T as T[K] extends JSON ? never : T[K] extends JSON | undefined ? K : never]?: Exclude<T[K], undefined> }
>

function failureOf(value: unknown, seen: Set<unknown>): Failure {
    seen.add(value)
    if (value instanceof Error || isPlainObject(value)) return read(() => objectFailure(value, seen)) ?? textFailure(value)
    return textFailure(value)
}

function objectFailure(object: object, seen: Set<unknown>): Failure {
    const fields = object as Record<string, unknown>
    const name = read(() => fields["name"])
    const message = read(() => fields["message"])
    const stack = read(() => fields["stack"])
    const cause = read(() => fields["cause"])
    const errors = read(() => fields["errors"])
    const meta = metaOf(object)

    const failure: Failure = {
        message: typeof message === "string" ? message : "",
        name: typeof name === "string" && name ? name : "Error",
    }
    if (typeof stack === "string") failure.stack = stack
    if (cause !== undefined && !seen.has(cause)) failure.cause = failureOf(cause, seen)
    if (Array.isArray(errors)) failure.errors = errors.filter((item) => !seen.has(item)).map((item) => failureOf(item, seen))
    if (Object.keys(meta).length) failure.meta = meta
    return failure
}

/** The fields of `object` that are not those of a `Failure`, with the ones that are JSON. */
function metaOf(object: object): JSON.Object {
    const given = read(() => (object as Record<string, unknown>)["meta"])
    const meta = isPlainObject(given) ? jsonFieldsOf(given) : {}
    for (const [key, value] of Object.entries(jsonFieldsOf(object))) {
        if (!FIELDS.has(key)) meta[key] = value
    }
    return meta
}

/** The fields of `object` that are JSON, the others are left out. */
function jsonFieldsOf(object: object): JSON.Object {
    const fields: JSON.Object = {}
    for (const key of read(() => Object.keys(object)) ?? []) {
        const value = read(() => (object as Record<string, unknown>)[key])
        if (read(() => isJSON(value, new Set()))) fields[key] = value as JSON
    }
    return fields
}

function textFailure(value: unknown): Failure {
    if (typeof value === "string") return { message: value, name: "Error" }
    return { message: read(() => String(value)) ?? "", name: "Error" }
}

/**
 * Whether `value` is JSON all the way down: no `Set`, `Date`, function or `undefined` in it, and no
 * cycle.
 */
function isJSON(value: unknown, parents: Set<object>): boolean {
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true
    if (typeof value !== "object" || parents.has(value)) return false
    if (!Array.isArray(value) && !isPlainObject(value)) return false
    parents.add(value)
    const result = Object.values(value).every((item) => isJSON(item, parents))
    parents.delete(value)
    return result
}

function read<T>(get: () => T): T | undefined {
    try { return get() }
    catch { return undefined }
}

/**
 * # removeStackTraces
 *
 * ```ts
 * Failure.removeStackTraces(failure)
 * ```
 *
 * A copy of `failure` without the stacks, also of its `cause` and `errors`: for failures that leave
 * the program, like in an HTTP response, where a stack tells where the code is.
 */
function removeStackTraces<F extends Failure>(failure: F): F {
    const removed = omit(failure, ["stack"]) as F
    if (!removed.cause && !removed.errors) return removed
    const copy = { ...removed }
    if (copy.cause) copy.cause = removeStackTraces(copy.cause)
    if (copy.errors) copy.errors = copy.errors.map((error) => removeStackTraces(error))
    return copy
}

export const Failure = {
    from,
    removeStackTraces,
}
