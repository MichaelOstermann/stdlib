import type { Parse } from "../internals/Parse"

export interface StringOption<T = string, Optional extends boolean = false, Defaulted extends boolean = false> {
    readonly config: StringOptionConfig<T>
    readonly kind: "string"
    default: {
        (value: string): StringOption<T, Optional, true>
        (value: string | undefined): StringOption<T, Optional, Defaulted>
    }
    desc: (desc: string) => StringOption<T, Optional, Defaulted>
    example: (example: string) => StringOption<T, Optional, Defaulted>
    optional: <O extends boolean>(optional: O) => StringOption<T, O, Defaulted>
    parse: <U>(parse: Parse<U>) => StringOption<U, Optional, Defaulted>
    sensitive: (sensitive: boolean) => StringOption<T, Optional, Defaulted>
}

export interface StringOptionConfig<T> {
    default?: string
    desc?: string
    example?: string
    optional: boolean
    parse: Parse<T>
    sensitive: boolean
}

export type StringValue<T, Optional, Defaulted> = Defaulted extends true
    ? T
    : Optional extends true
        ? T | undefined
        : T

/**
 * # string
 *
 * Text: `--name Jane` or `--name=Jane`.
 *
 * `.default(undefined)` changes nothing, for environment variables that may not be set.
 * `.sensitive(true)` masks the value while it is typed, and hides the default in the help.
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
export function string(): StringOption {
    return build({ optional: false, sensitive: false, parse: (value) => Ok(value) })
}

function build<T, Optional extends boolean, Defaulted extends boolean>(config: StringOptionConfig<T>): StringOption<T, Optional, Defaulted> {
    return {
        config,
        default: ((value: string | undefined) => build({ ...config, default: value ?? config.default })) as StringOption<T, Optional, Defaulted>["default"],
        kind: "string",
        desc: (desc) => build({ ...config, desc }),
        example: (example) => build({ ...config, example }),
        optional: (optional) => build({ ...config, optional }),
        parse: (parse) => build({ ...config, parse }),
        sensitive: (sensitive) => build({ ...config, sensitive }),
    }
}
