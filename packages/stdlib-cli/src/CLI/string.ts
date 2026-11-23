import type { CLI } from "."
import { Ok } from "@monstermann/stdlib"

/**
 * # string
 *
 * Creates an option that takes text: `--name Jane` or `--name=Jane`.
 *
 * `.default(undefined)` changes nothing. This helps with environment variables that may not be set.
 * `.sensitive(true)` masks the value while typing. The help then hides the default.
 *
 * ## Example
 *
 * ```ts
 * const seats = CLI.string()
 *     .desc("How many seats they get")
 *     .default("1")
 *     .parse((value) => Number.isInteger(Number(value)) ? Ok(Number(value)) : Err("Must be a whole number"))
 *
 * const password = CLI.string()
 *     .desc("Your password")
 *     .default(process.env.MIKO_PASSWORD)
 *     .sensitive(true)
 * ```
 */
export function string(): CLI.StringOption {
    return build({ optional: false, sensitive: false, parse: (value) => Ok(value) })
}

function build<T, Optional extends boolean, Defaulted extends boolean>(config: CLI.StringOptionConfig<T>): CLI.StringOption<T, Optional, Defaulted> {
    return {
        config,
        default: ((value: string | undefined) => build({ ...config, default: value ?? config.default })) as CLI.StringOption<T, Optional, Defaulted>["default"],
        kind: "string",
        desc: (desc) => build({ ...config, desc }),
        example: (example) => build({ ...config, example }),
        optional: (optional) => build({ ...config, optional }),
        parse: (parse) => build({ ...config, parse }),
        sensitive: (sensitive) => build({ ...config, sensitive }),
    }
}
