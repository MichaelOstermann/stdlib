import type { CLI } from "."

/**
 * # enum
 *
 * Creates an option that takes one of a fixed set of values. Each value has a description.
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
function enumOption(): CLI.EnumOption {
    return build({ options: {} })
}

function build<K extends string, Defaulted extends boolean>(config: CLI.EnumOptionConfig<K>): CLI.EnumOption<K, Defaulted> {
    return {
        config,
        kind: "enum",
        default: (value) => build({ ...config, default: value }),
        desc: (desc) => build({ ...config, desc }),
        options: (options) => build({ ...config, default: undefined, options }),
    }
}

export { enumOption as enum }
