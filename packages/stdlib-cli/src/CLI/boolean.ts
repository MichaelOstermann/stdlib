export interface BooleanOption {
    readonly config: BooleanOptionConfig
    readonly kind: "boolean"
    default: (value: boolean) => BooleanOption
    desc: (desc: string) => BooleanOption
}

export interface BooleanOptionConfig {
    default: boolean
    desc?: string
}

/**
 * # boolean
 *
 * On or off, off unless given: `--force` or `--force=false`.
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
