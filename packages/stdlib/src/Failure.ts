import type { JSON } from "./JSON"
import { isPlainObject } from "./Object/isPlainObject"

/**
 * What went wrong, as plain data. Unlike an `Error`, a `Failure` survives `JSON.stringify`. `name`
 * tells failures apart, and `message` is for people. Any other JSON field holds the details.
 * `cause` is the failure that led to this one. `errors` are the failures this one is made of. Any
 * type with these fields is a `Failure`, as long as it is a `type` and not an `interface`.
 *
 * ```ts
 * type TakenError = { name: "TakenError", message: string, email: string }
 * ```
 */
export type Failure = JSON.Object & {
    cause?: Failure
    errors?: Failure[]
    message: string
    name: string
    stack?: string
}

/** The fields that every `Failure` may have. Other fields hold the details. */
const FIELDS = new Set(["cause", "errors", "message", "name", "stack"])

/**
 * # from
 *
 * Turns anything that was thrown, or that something failed with, into a `Failure`:
 *
 * - A `Failure` comes back with the same fields
 * - An `Error` keeps its `name`, `message`, `stack` and other JSON fields
 * - A plain object keeps its `name`, `message` and other JSON fields
 * - Anything else becomes the `message`
 *
 * The `cause` and the `errors` of an `AggregateError` become failures the same way. Fields that are
 * not JSON are left out. `value` is never changed, and `from` never throws.
 *
 * ## Example
 *
 * ```ts
 * Failure.from("Not found"); // { name: "Error", message: "Not found" }
 * Failure.from({ name: "TakenError", message: "Already a member", email }); // { name: "TakenError", message: string, email: string }
 *
 * try {
 *     await save();
 * } catch (thrown) {
 *     log(Failure.from(thrown));
 * }
 * ```
 */
function from<T extends { name?: N }, N extends string>(value: T): T extends Failure ? T : Failure
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

    const failure: Failure = {
        ...detailsOf(object),
        message: typeof message === "string" ? message : "",
        name: typeof name === "string" && name ? name : "Error",
    }
    if (typeof stack === "string") failure.stack = stack
    if (cause !== undefined && !seen.has(cause)) failure.cause = failureOf(cause, seen)
    if (Array.isArray(errors)) failure.errors = errors.filter((item) => !seen.has(item)).map((item) => failureOf(item, seen))
    return failure
}

/** Returns the JSON fields of `object` that are not in `FIELDS`. */
function detailsOf(object: object): JSON.Object {
    const details: JSON.Object = {}
    for (const [key, value] of Object.entries(jsonFieldsOf(object))) {
        if (!FIELDS.has(key)) details[key] = value
    }
    return details
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
 * # details
 *
 * Returns the fields of `failure` that describe it, without `name`, `message`, `stack`, `cause` and
 * `errors`.
 *
 * ## Example
 *
 * ```ts
 * Failure.details({ name: "TakenError", message: "Already a member", email: "jane@miko.dev" });
 * // { email: "jane@miko.dev" }
 * ```
 */
function details(failure: Failure): JSON.Object {
    return Object.fromEntries(Object.entries(failure).filter(([key]) => !FIELDS.has(key)))
}

/**
 * # removeStackTraces
 *
 * Returns a copy of `failure` without stacks, including the stacks of `cause` and `errors`. Use it
 * for failures that leave the program, like in an HTTP response, where a stack reveals the code.
 */
function removeStackTraces<F extends Failure>(failure: F): F {
    const copy = { ...failure }
    delete copy.stack
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
 *   to the `Error`. The other fields become fields of the `Error`. The `cause` and `errors` become
 *   errors too. With `errors`, the result is an `AggregateError`
 *
 * ## Example
 *
 * ```ts
 * throw Failure.toError({ name: "TakenError", message: "Already a member", email });
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
    for (const [key, value] of Object.entries(failure)) {
        if (!FIELDS.has(key)) Object.defineProperty(error, key, { configurable: true, enumerable: true, value, writable: true })
    }
    return error
}

export const Failure = {
    details,
    from,
    removeStackTraces,
    toError,
}
