import type { CLI } from "."

/**
 * # boolean
 *
 * Creates an option that is on or off: `--force` or `--force=false`. The option is off when not
 * given.
 *
 * ## Example
 *
 * ```ts
 * const force = CLI.boolean().desc("Overwrite what is there")
 * ```
 */
export function boolean(): CLI.BooleanOption {
    return build({ default: false })
}

function build(config: CLI.BooleanOptionConfig): CLI.BooleanOption {
    return {
        config,
        kind: "boolean",
        default: (value) => build({ ...config, default: value }),
        desc: (desc) => build({ ...config, desc }),
    }
}
