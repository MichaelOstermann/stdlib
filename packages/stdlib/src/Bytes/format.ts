const decimal = ["B", "kB", "MB", "GB", "TB", "PB"]
const binary = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]

let formatter: Intl.NumberFormat | undefined

type FormatOptions = {
    /**
     * Counts in 1024s and writes `KiB`, `MiB`, …. Without `binary`, counts in thousands and writes
     * `kB`, `MB`, …
     */
    binary?: boolean
    /** The language of the number. Defaults to the language of the runtime. */
    locales?: Intl.LocalesArgument
    /** `1` by default. */
    maximumFractionDigits?: number
}

/**
 * # format
 *
 * Formats `bytes` in the largest unit that fits at least once. By default, counts in thousands:
 * `kB`, `MB`, …. With `binary`, counts in 1024s: `KiB`, `MiB`, ….
 *
 * ## Example
 *
 * ```ts
 * Bytes.format(512); // "512 B"
 * Bytes.format(1_500); // "1.5 kB"
 * Bytes.format(1_536, { binary: true }); // "1.5 KiB"
 * Bytes.format(128 * Bytes.MB); // "128 MB"
 * Bytes.format(1_234_567, { locales: "de", maximumFractionDigits: 2 }); // "1,23 MB"
 * ```
 */
export function format(bytes: number, options?: FormatOptions): string {
    const base = options?.binary ? 1024 : 1000
    const units = options?.binary ? binary : decimal

    let value = bytes
    let unit = 0
    while (Math.abs(value) >= base && unit < units.length - 1) {
        value /= base
        unit++
    }

    const custom = options?.locales !== undefined || options?.maximumFractionDigits !== undefined
    const number = custom
        ? new Intl.NumberFormat(options.locales, { maximumFractionDigits: options.maximumFractionDigits ?? 1 })
        : formatter ??= new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })

    return `${number.format(value)} ${units[unit]}`
}
