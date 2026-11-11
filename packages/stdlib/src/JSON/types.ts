/**
 * Anything `JSON.stringify` turns into the same value `JSON.parse` gives back. Objects have to be
 * declared with `type`, an `interface` is not accepted.
 */
export type JSONValue = boolean | JSONObject | JSONValue[] | number | readonly JSONValue[] | string | null

/** An object whose values are all `JSONValue`. */
export type JSONObject = { [key: string]: JSONValue }
