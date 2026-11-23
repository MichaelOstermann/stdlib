import type { CLI } from "."
import { promptOption } from "./promptOption"

/**
 * # promptOptions
 *
 * Asks for the value of each of `options`.
 *
 * ## Example
 *
 * ```ts
 * const options = await CLI.promptOptions(add.config.options)
 * ```
 */
export async function promptOptions<O extends CLI.CommandOptions>(options: O): Promise<CLI.InferOptions<O>> {
    const values: Record<string, unknown> = {}
    for (const [name, definition] of Object.entries(options)) values[name] = await promptOption(name, definition)
    return values as CLI.InferOptions<O>
}
