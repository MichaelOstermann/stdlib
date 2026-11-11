import type { BooleanOption, BooleanOptionConfig } from "./types"

/**
 * # boolean
 *
 * ```ts
 * function CLI.boolean(): BooleanOption
 * ```
 *
 * An option that is on or off, off when it is not given. Each call returns a new option, so one can
 * be the base of others.
 *
 * ## Example
 *
 * ```ts
 * const force = CLI.boolean().desc("Overwrite what is there")
 * ```
 */
export function boolean(): BooleanOption {
    return build({ default: false })
}

function build(config: BooleanOptionConfig): BooleanOption {
    return {
        config,
        kind: "boolean",
        default: (value) => build({ ...config, default: value }),
        desc: (desc) => build({ ...config, desc }),
    }
}
