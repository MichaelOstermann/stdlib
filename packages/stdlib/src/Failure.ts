import type { JSONObject, JSONValue } from "./JSON/types"
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
    meta?: JSONObject
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
 *
 * try {
 *     await save();
 * } catch (thrown) {
 *     log(Failure.from(thrown));
 * }
 * ```
 */
function from<T>(value: T): T extends Failure ? T : Failure
function from(value: unknown): Failure {
    return failureOf(value, new Set())
}

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
function metaOf(object: object): JSONObject {
    const meta: JSONObject = {}
    const fields = object as Record<string, unknown>
    const given = read(() => fields["meta"])
    if (isPlainObject(given)) Object.assign(meta, jsonOf(given))
    for (const key of read(() => Object.keys(object)) ?? []) {
        if (FIELDS.has(key)) continue
        const value = jsonOf(read(() => fields[key]))
        if (value !== undefined) meta[key] = value
    }
    return meta
}

function textFailure(value: unknown): Failure {
    if (typeof value === "string") return { message: value, name: "Error" }
    return { message: read(() => String(value)) ?? "", name: "Error" }
}

function jsonOf(value: unknown): JSONValue | undefined {
    try {
        const text = JSON.stringify(value)
        if (text === undefined) return undefined
        return JSON.parse(text) as JSONValue
    }
    catch {
        return undefined
    }
}

function read<T>(get: () => T): T | undefined {
    try {
        return get()
    }
    catch {
        return undefined
    }
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
