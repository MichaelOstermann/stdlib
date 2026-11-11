import type { EnumOption, EnumOptionConfig } from "./types"

/**
 * # enum
 *
 * ```ts
 * function CLI.enum(): EnumOption
 * ```
 *
 * An option that takes one of its options, each with a description. Each call returns a new option,
 * so one can be the base of others.
 *
 * ## Example
 *
 * ```ts
 * const role = CLI.enum()
 *     .desc("What they are allowed to do")
 *     .options({
 *         admin: "Everything",
 *         member: "Everything but billing",
 *     })
 *     .default("member")
 * ```
 */
export function enumI(): EnumOption {
    return build({ options: {} })
}

function build<K extends string, Defaulted extends boolean>(config: EnumOptionConfig<K>): EnumOption<K, Defaulted> {
    return {
        config,
        kind: "enum",
        default: (value) => build({ ...config, default: value }),
        desc: (desc) => build({ ...config, desc }),
        options: (options) => build({ ...config, default: undefined, options }),
    }
}
