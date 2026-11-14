import { isPlainObject } from "../Object/isPlainObject"

/**
 * # from
 *
 * ```ts
 * Error.from(value)
 * ```
 *
 * Turns anything that was thrown, or that something failed with, into an `Error`:
 *
 * - An `Error` is returned as it is, or as a copy with a missing `name` or `message` filled in
 * - A plain object becomes an `Error` with its `name` and `message`, its other fields stay on it
 * - Anything else becomes the `message` of an `Error`
 *
 * The `cause` and the `errors` of an `AggregateError` are turned into errors the same way, in a
 * copy when they are not all errors. Never changes `value`, and never throws.
 *
 * ## Example
 *
 * ```ts
 * Error.from("Not found"); // Error: Not found
 *
 * Error.from({ name: "TakenError", message: "Already a member", email: "jane@miko.dev" });
 * // TakenError: Already a member, error.email is "jane@miko.dev"
 *
 * try {
 *     await save();
 * } catch (thrown) {
 *     log(Error.from(thrown));
 * }
 * ```
 */
export function from<T>(value: T): T extends Error ? T : Error
export function from(value: unknown): Error {
    return errorOf(value, new Set())
}

function errorOf(value: unknown, seen: Set<unknown>): Error {
    const error = createError(value)
    seen.add(value)
    seen.add(error)
    const fixes = fixesOf(error, seen)
    if (!Object.keys(fixes).length) return error
    const fixed = error === value ? copy(error) : error
    for (const [key, fix] of Object.entries(fixes)) define(fixed, key, fix)
    return fixed
}

/**
 * What has to change: a missing `name` or `message`, a `cause` or `errors` that are not all errors.
 */
function fixesOf(error: Error, seen: Set<unknown>): Record<string, unknown> {
    const fixes: Record<string, unknown> = {}

    const name = read(() => error.name)
    if (typeof name !== "string" || !name) fixes["name"] = read(() => error.constructor.name) || "Error"

    const message = read(() => error.message)
    if (typeof message !== "string") fixes["message"] = ""

    const cause = read(() => error.cause)
    const causeError = cause !== undefined && !seen.has(cause) ? errorOf(cause, seen) : cause
    if (causeError !== cause) fixes["cause"] = causeError

    const errors = read(() => (error as { errors?: unknown }).errors)
    if (Array.isArray(errors)) {
        const items = errors.filter((item) => !seen.has(item)).map((item) => errorOf(item, seen))
        if (items.length !== errors.length || items.some((item, index) => item !== errors[index])) fixes["errors"] = items
    }

    return fixes
}

/**
 * A new error with the same class and own properties, which can be changed even when `error` is
 * frozen.
 */
function copy(error: Error): Error {
    const result = Object.create(Object.getPrototypeOf(error)) as Error
    for (const key of read(() => Reflect.ownKeys(error)) ?? []) {
        const descriptor = read(() => Object.getOwnPropertyDescriptor(error, key))
        if (descriptor) Object.defineProperty(result, key, { ...descriptor, configurable: true })
    }
    return result
}

function createError(value: unknown): Error {
    if (value instanceof Error) return value
    const fromObject = isPlainObject(value) ? read(() => objectError(value)) : undefined
    if (fromObject) return fromObject
    return new Error(read(() => String(value)) ?? "")
}

function objectError(object: Record<string, unknown>): Error {
    const { cause, errors, message, name, stack, ...fields } = object
    const error = Object.assign(new Error(typeof message === "string" ? message : ""), fields)
    if (typeof name === "string" && name) define(error, "name", name)
    if (typeof stack === "string") define(error, "stack", stack)
    if (cause !== undefined) define(error, "cause", cause)
    if (errors !== undefined) define(error, "errors", errors)
    return error
}

/**
 * Sets `key` like `Error` sets its own: hidden from `Object.keys`. Errors that are frozen keep
 * theirs.
 */
function define(error: Error, key: string, value: unknown): void {
    read(() => Object.defineProperty(error, key, { configurable: true, enumerable: false, value, writable: true }))
}

function read<T>(get: () => T): T | undefined {
    try { return get() }
    catch { return undefined }
}
