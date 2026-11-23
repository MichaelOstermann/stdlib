import { _ } from "../../_"

/**
 * Whether a value has the shape of a pattern:
 *
 * - arrays match arrays of the same length, comparing each position that is not `_`
 * - other objects match objects that have the same value for each of their fields
 * - nothing else matches anything
 */
export function matches(value: unknown, pattern: unknown): boolean {
    if (typeof pattern !== "object" || pattern === null) return false
    if (typeof value !== "object" || value === null) return false

    if (Array.isArray(pattern)) {
        if (!Array.isArray(value) || value.length !== pattern.length) return false
        for (let i = 0; i < pattern.length; i++) {
            if (pattern[i] !== _ && pattern[i] !== value[i]) return false
        }
        return true
    }

    // Including the ones that are symbols, which asking for all keys at once takes much longer for.
    const keys = Object.keys(pattern)
    for (let i = 0; i < keys.length; i++) {
        if ((value as any)[keys[i]!] !== (pattern as any)[keys[i]!]) return false
    }
    const symbols = Object.getOwnPropertySymbols(pattern)
    for (let i = 0; i < symbols.length; i++) {
        if ((value as any)[symbols[i]!] !== (pattern as any)[symbols[i]!]) return false
    }
    return true
}
