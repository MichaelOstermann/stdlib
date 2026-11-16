import type { CommandOptions, InferOptions } from "../types"
import { option } from "./option"

/**
 * # options
 *
 * Asks for the value of each of `options`.
 *
 * ## Example
 *
 * ```ts
 * const options = await CLI.prompt.options(add.config.options)
 * ```
 */
export async function options<O extends CommandOptions>(options: O): Promise<InferOptions<O>> {
    const values: Record<string, unknown> = {}
    for (const [name, definition] of Object.entries(options)) values[name] = await option(name, definition)
    return values as InferOptions<O>
}
