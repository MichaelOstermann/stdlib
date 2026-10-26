import { GB } from "./GB"
import { GiB } from "./GiB"
import { KB } from "./KB"
import { KiB } from "./KiB"
import { MB } from "./MB"
import { MiB } from "./MiB"
import { TB } from "./TB"
import { TiB } from "./TiB"

const units: Record<string, number> = {
    b: 1,
    gb: GB,
    gib: GiB,
    kb: KB,
    kib: KiB,
    mb: MB,
    mib: MiB,
    tb: TB,
    tib: TiB,
}

/**
 * # parse
 *
 * ```ts
 * function Bytes.parse(target: string): number | undefined
 * ```
 *
 * Returns the bytes of a size that is written as a number and a unit, in any case: `B`, `kB`, `MB`,
 * `GB` and `TB` count in thousands, `KiB`, `MiB`, `GiB` and `TiB` in 1024s. Returns `undefined` for
 * everything else.
 *
 * There are no bits, `Mb` is a megabyte.
 *
 * ## Example
 *
 * ```ts
 * Bytes.parse("512B"); // 512
 * Bytes.parse("64kb"); // 64_000
 * Bytes.parse("64KiB"); // 65_536
 * Bytes.parse("1.5 GB"); // 1_500_000_000
 * Bytes.parse("128"); // undefined
 * ```
 */
export function parse(target: string): number | undefined {
    const match = /^(\d+(?:\.\d+)?)\s*([kmgt]i?b|b)$/i.exec(target.trim())
    if (!match) return undefined
    return Math.round(Number(match[1]) * units[match[2]!.toLowerCase()]!)
}
