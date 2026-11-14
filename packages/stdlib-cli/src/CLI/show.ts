import { error } from "../internals/show/error"
import { json } from "../internals/show/json"

export interface ShowOptions {
    /**
     * One line like `{ email: jane@miko.dev, seats: 1 }` when everything fits into `width`, off by
     * default.
     */
    compact?: boolean
    /** Items of an array or object shown before `… 3 more`, 100 by default. */
    maxItems?: number
    /** Characters of a string shown before `… 3 more characters`, 1000 by default. */
    maxString?: number
    /** The columns to fit into, the terminal by default. */
    width?: number
}

/**
 * # show
 *
 * ```ts
 * function CLI.show(value: JSONValue | Error, options?: ShowOptions): string
 * ```
 *
 * Turns JSON or an error into text for a person.
 *
 * JSON looks like YAML: one `key: value` or `- item` per line, nested ones indented. With
 * `compact`, everything is on one line instead, when it fits. Strings and keys are quoted like
 * `Bun.YAML` does, and long strings wrap in line with where they start. A string on its own is
 * returned as it is.
 *
 * An error is `name: message` in red, with its other fields below like JSON, then its `cause` and
 * the `errors` of an `AggregateError`, each indented. Fields that are not JSON are left out. Pass
 * anything that was thrown through `Error.from` first.
 *
 * ## Example
 *
 * ```ts
 * CLI.show({ email: "jane@miko.dev", tags: ["admin"], seats: 1 })
 * // email: jane@miko.dev
 * // tags:
 * //   - admin
 * // seats: 1
 *
 * CLI.show({ email: "jane@miko.dev", tags: ["admin"] }, { compact: true })
 * // { email: jane@miko.dev, tags: [admin] }
 *
 * const cause = Object.assign(new Error("fetch failed"), { host: "db.miko.dev" })
 * CLI.show(Object.assign(new TypeError("Could not add the member", { cause }), { status: 503 }))
 * // TypeError: Could not add the member
 * //   status: 503
 * //   cause: Error: fetch failed
 * //     host: db.miko.dev
 * ```
 */
export function show(value: JSONValue | Error, options: ShowOptions = {}): string {
    if (value instanceof Error) return error(value, options)
    return json(value, options)
}
