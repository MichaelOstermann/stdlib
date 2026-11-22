import type { JSON } from "./JSON"
import type { Simplify } from "./types"
import { isPlainObject } from "./Object/isPlainObject"
import { omit } from "./Object/omit"

/**
 * What went wrong, as plain data. Unlike an `Error`, a `Failure` survives `JSON.stringify`. `name`
 * tells failures apart, `message` is for people, and `meta` holds the rest. `cause` is the failure
 * that led to this one. `errors` are the failures this one is made of. Any type with these fields
 * is a `Failure`.
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

/** The fields of a `Failure`. Other fields of an object go into `meta`. */
const FIELDS = new Set(["cause", "errors", "message", "meta", "name", "stack"])

/**
 * # from
 *
 * Turns anything that was thrown, or that something failed with, into a `Failure`:
 *
 * - A `Failure` comes back with the same fields
 * - An `Error` keeps its `name`, `message` and `stack`. Its other JSON fields go into `meta`
 * - A plain object keeps its `name` and `message`. Its other JSON fields go into `meta`
 * - Anything else becomes the `message`
 *
 * The `cause` and the `errors` of an `AggregateError` become failures the same way. `value` is
 * never changed, and `from` never throws.
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
 * The return type of `from` for `T`: a `Failure` with the fields of `T`. The other JSON fields of
 * `T` move into `meta`.
 */
type FailureOf<T> = T extends Failure
    ? Exclude<keyof T, keyof Failure> extends never
        ? T
        : Simplify<Omit<T, Exclude<keyof T, keyof Failure> | "meta"> & MetaFieldOf<T>>
    : Failure

/**
 * `meta` when it surely has fields, `meta?` when it may have some, and nothing when it has none.
 */
type MetaFieldOf<T> = Record<never, never> extends MetaOf<T>
    ? [keyof MetaOf<T>] extends [never]
        ? Record<never, never>
        : { meta?: MetaOf<T> }
    : { meta: MetaOf<T> }

/** The `meta` of `T`, plus the other JSON fields of `T`. */
type MetaOf<T> = Simplify<Omit<T extends { meta?: infer Meta } ? NonNullable<Meta> : Record<never, never>, keyof JSONFieldsOf<Omit<T, keyof Failure>>> & JSONFieldsOf<Omit<T, keyof Failure>>>

/** The JSON fields of `T`. Fields that are only sometimes JSON become optional. */
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

/** Returns the JSON fields of `object` that a `Failure` does not have. */
function metaOf(object: object): JSON.Object {
    const given = read(() => (object as Record<string, unknown>)["meta"])
    const meta = isPlainObject(given) ? jsonFieldsOf(given) : {}
    for (const [key, value] of Object.entries(jsonFieldsOf(object))) {
        if (!FIELDS.has(key)) meta[key] = value
    }
    return meta
}

/** Returns the JSON fields of `object`. Other fields are left out. */
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
 * Whether `value` is JSON all the way down: no `Set`, `Date`, function, `undefined`, or cycle.
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
 * Returns a copy of `failure` without stacks, including the stacks of `cause` and `errors`. Use it
 * for failures that leave the program, like in an HTTP response, where a stack reveals the code.
 */
function removeStackTraces<F extends Failure>(failure: F): F {
    const removed = omit(failure, ["stack"]) as F
    if (!removed.cause && !removed.errors) return removed
    const copy = { ...removed }
    if (copy.cause) copy.cause = removeStackTraces(copy.cause)
    if (copy.errors) copy.errors = copy.errors.map((error) => removeStackTraces(error))
    return copy
}

/**
 * # toError
 *
 * Turns anything into an `Error`, for code that has to throw. The reverse of `Failure.from`:
 *
 * - An `Error` comes back as it is
 * - Anything else goes through `Failure.from` first. The `name`, `message` and `stack` carry over
 *   to the `Error`. The `meta` becomes fields of the `Error`. The `cause` and `errors` become
 *   errors too. With `errors`, the result is an `AggregateError`
 *
 * ## Example
 *
 * ```ts
 * throw Failure.toError({ name: "TakenError", message: "Already a member", meta: { email } });
 * // TakenError: Already a member, with `error.email`
 * ```
 */
function toError(value: unknown): Error {
    if (value instanceof Error) return value
    return errorOf(failureOf(value, new Set()))
}

function errorOf(failure: Failure): Error {
    const options = failure.cause ? { cause: errorOf(failure.cause) } : undefined
    const error = failure.errors
        ? new AggregateError(failure.errors.map(errorOf), failure.message, options)
        : new Error(failure.message, options)
    error.name = failure.name
    if (failure.stack) error.stack = failure.stack
    for (const [key, value] of Object.entries(failure.meta ?? {})) {
        if (!FIELDS.has(key)) Object.defineProperty(error, key, { configurable: true, enumerable: true, value, writable: true })
    }
    return error
}

export const Failure = {
    from,
    removeStackTraces,
    toError,
}
