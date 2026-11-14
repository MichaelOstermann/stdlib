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
 * - An `Error` is returned as it is, with a missing `name` or `message` filled in
 * - A plain object becomes an `Error` with its `name` and `message`, its other fields stay on it
 * - Anything else becomes the `message` of an `Error`
 *
 * The `cause` and the `errors` of an `AggregateError` are turned into errors the same way. Never
 * throws.
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
export function from(value: unknown): Error {
    return errorOf(value, new Set())
}

function errorOf(value: unknown, seen: Set<unknown>): Error {
    const error = createError(value)
    seen.add(value)
    seen.add(error)

    const name = read(() => error.name)
    if (typeof name !== "string" || !name) define(error, "name", read(() => error.constructor.name) || "Error")

    const message = read(() => error.message)
    if (typeof message !== "string") define(error, "message", "")

    const cause = read(() => error.cause)
    if (cause !== undefined && !seen.has(cause)) define(error, "cause", errorOf(cause, seen))

    const errors = read(() => (error as { errors?: unknown }).errors)
    if (Array.isArray(errors)) define(error, "errors", errors.filter((item) => !seen.has(item)).map((item) => errorOf(item, seen)))

    return error
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
    try {
        return get()
    }
    catch {
        return undefined
    }
}
