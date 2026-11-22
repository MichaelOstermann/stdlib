/**
 * # safeStringify
 *
 * Turns `value` into JSON like `JSON.stringify`, but never throws. Parts that cannot be written as
 * JSON are left out, and nothing more.
 *
 * - a `bigint` becomes a string of its digits
 * - an object inside itself is left out
 * - a property that throws when read is left out, and so is a `toJSON` that throws
 * - returns `"null"` when nothing is left, or when `value` cannot be written as JSON
 *
 * Use it for logs and reports, where something incomplete is better than nothing.
 *
 * ## Example
 *
 * ```ts
 * JSON.safeStringify({ a: 1 }); // `{"a":1}`
 * JSON.safeStringify({ id: 1n }); // `{"id":"1"}`
 *
 * const node = { name: "a", self: null as unknown };
 * node.self = node;
 * JSON.safeStringify(node); // `{"name":"a"}`
 *
 * JSON.safeStringify(undefined); // "null"
 * ```
 */
export function safeStringify(value: unknown): string {
    try {
        // Most values are fine as they are.
        return (JSON.stringify(value) as string | undefined) ?? "null"
    }
    catch {
        try {
            return (JSON.stringify(sanitize(value, new Set())) as string | undefined) ?? "null"
        }
        catch {
            // Too deep to walk through.
            return "null"
        }
    }
}

/**
 * Returns a copy of `value` without the parts that cannot be written as JSON. `ancestors` are the
 * objects that contain `value`.
 */
function sanitize(value: unknown, ancestors: Set<object>): unknown {
    if (typeof value === "bigint") return value.toString()
    if (typeof value !== "object" || value === null) return value
    if (ancestors.has(value)) return undefined

    try {
        const toJSON = (value as { toJSON?: unknown }).toJSON
        if (typeof toJSON === "function") {
            const replaced: unknown = toJSON.call(value)
            if (replaced !== value) return sanitize(replaced, ancestors)
        }
    }
    catch {
        return undefined
    }

    ancestors.add(value)
    try {
        if (Array.isArray(value)) {
            const result: unknown[] = []
            for (let i = 0; i < value.length; i++) result.push(sanitize(read(value, i), ancestors))
            return result
        }

        const result: Record<string, unknown> = {}
        for (const key of Object.keys(value)) {
            const property = sanitize(read(value, key), ancestors)
            if (property !== undefined) Object.defineProperty(result, key, { configurable: true, enumerable: true, value: property, writable: true })
        }
        return result
    }
    finally {
        ancestors.delete(value)
    }
}

function read(target: object, key: number | string): unknown {
    try {
        return (target as Record<number | string, unknown>)[key]
    }
    catch {
        return undefined
    }
}
