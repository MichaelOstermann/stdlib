/** Throws for a value that has not been matched by anything. */
export function throwUnmatched(value: unknown): never {
    let description: string
    try {
        description = typeof value === "object" ? JSON.stringify(value) : String(value)
    }
    catch {
        // Something that can not be turned into JSON, as it refers to itself, or contains a `bigint`.
        // Objects without a prototype can not be turned into a string either.
        description = Object.prototype.toString.call(value)
    }
    throw new Error(`Pattern matching error: no pattern matches value ${description}`)
}
