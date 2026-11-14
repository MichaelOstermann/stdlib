import type { StringOption, StringOptionConfig } from "./types"

/**
 * # string
 *
 * ```ts
 * function CLI.string(): StringOption<string>
 * ```
 *
 * An option that takes text: `--first-name John` or `--first-name=John`. Each call returns a new
 * option, so one can be the base of others.
 *
 * `.default()` with `undefined` keeps the option as it is, so it can take an environment variable
 * that may not be set.
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
 * ```
 */
export function string(): StringOption {
    return build({ optional: false, parse: (value) => Ok(value) })
}

function build<T, Optional extends boolean, Defaulted extends boolean>(config: StringOptionConfig<T>): StringOption<T, Optional, Defaulted> {
    return {
        config,
        kind: "string",
        default: (value: string | undefined) => build({ ...config, default: value ?? config.default }),
        desc: (desc) => build({ ...config, desc }),
        example: (example) => build({ ...config, example }),
        optional: (optional) => build({ ...config, optional }),
        parse: (parse) => build({ ...config, parse }),
    }
}
