import type { StandardSchemaV1 } from "@standard-schema/spec"

/**
 * Turns a typed word into a value: a function that returns a `Result`, or a Standard Schema such as
 * zod.
 */
export type Parse<T> =
    | ((value: string) => Result<T, string> | Promise<Result<T, string>>)
    | StandardSchemaV1<unknown, T>

export const Parse = {
    /** The value, or one message per problem. */
    async value<T>(parse: Parse<T>, value: string): Promise<Result<T, string[]>> {
        if (typeof parse === "function") return (await parse(value)).mapErr((error) => [error])
        const result = await parse["~standard"].validate(value)
        if (result.issues) return Err(result.issues.map((issue) => issue.message))
        return Ok(result.value)
    },
}
