import type { Color } from "."
import { fromRgb, normalizeHue } from "../internals/colors"

/**
 * # parse
 *
 * ```ts
 * Color.parse(value)
 * ```
 *
 * Reads a CSS color written as hex, `rgb()`, `rgba()`, `hsl()`, `hsla()` or `oklch()`, in the modern and the comma syntax. Returns `undefined` for everything else, named colors too.
 *
 * ## Example
 *
 * ```ts
 * Color.parse("#1f2029"); // ≈ { l: 0.2465, c: 0.0171, h: 280.08, alpha: 1 }
 * Color.parse("rgb(255 0 0 / 50%)"); // ≈ { l: 0.628, c: 0.2577, h: 29.23, alpha: 0.5 }
 * Color.parse("oklch(78% 0.2 262)"); // { l: 0.78, c: 0.2, h: 262, alpha: 1 }
 * Color.parse("red"); // undefined
 * ```
 */
export function parse(value: string): Color | undefined {
    value = value.trim().toLowerCase()
    const color = value.startsWith("#") ? parseHex(value) : parseFunction(value)
    if (!color) return undefined
    if (Number.isNaN(color.l + color.c + color.h + color.alpha)) return undefined
    return color
}

function parseHex(value: string): Color | undefined {
    if (!/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.test(value)) return undefined
    const hex = value.length <= 5 ? value.slice(1).replaceAll(/./g, "$&$&") : value.slice(1)
    const channel = (i: number): number => Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return fromRgb(channel(0), channel(2), channel(4), hex.length === 8 ? channel(6) : 1)
}

function parseFunction(value: string): Color | undefined {
    const match = /^(rgba?|hsla?|oklch)\((.*)\)$/.exec(value)
    if (!match) return undefined
    const [channels, alpha] = match[2]!.split("/")
    const tokens = channels!.split(/[\s,]+/).filter(Boolean)
    if (tokens.length !== 3 && !(tokens.length === 4 && alpha === undefined)) return undefined
    const [x, y, z, a = alpha?.trim() ?? "1"] = tokens as [string, string, string, string?]
    const opacity = number(a, 1)

    if (match[1] === "oklch") {
        return { alpha: opacity, c: number(y, 0.4), h: normalizeHue(angle(z)), l: number(x, 1) }
    }

    if (match[1]!.startsWith("rgb")) {
        return fromRgb(number(x, 255) / 255, number(y, 255) / 255, number(z, 255) / 255, opacity)
    }

    const h = angle(x)
    const s = number(y, 100) / 100
    const l = number(z, 100) / 100
    const k = (n: number): number => (n + h / 30) % 12
    const f = (n: number): number => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))
    return fromRgb(f(0), f(8), f(4), opacity)
}

/** A number, where a percentage is of `full`. */
function number(token: string, full: number): number {
    if (token === "none") return 0
    if (token.endsWith("%")) return Number(token.slice(0, -1)) / 100 * full
    return Number(token)
}

function angle(token: string): number {
    if (token === "none") return 0
    if (token.endsWith("deg")) return Number(token.slice(0, -3))
    if (token.endsWith("grad")) return Number(token.slice(0, -4)) * 0.9
    if (token.endsWith("rad")) return Number(token.slice(0, -3)) * 180 / Math.PI
    if (token.endsWith("turn")) return Number(token.slice(0, -4)) * 360
    return Number(token)
}
