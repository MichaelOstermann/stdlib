export interface EnumOption<K extends string = never, Defaulted extends boolean = false> {
    readonly config: EnumOptionConfig<K>
    readonly kind: "enum"
    default: (value: K) => EnumOption<K, true>
    desc: (desc: string) => EnumOption<K, Defaulted>
    options: <const C extends Record<string, string>>(options: C) => EnumOption<keyof C & string, false>
}

export interface EnumOptionConfig<K extends string> {
    default?: K
    desc?: string
    options: Record<K, string>
}

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
