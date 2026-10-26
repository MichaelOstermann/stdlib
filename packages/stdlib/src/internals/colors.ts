import type { Color } from "../Color"
import { clamp } from "../Math/clamp"

// The conversion between sRGB and OKLab is taken from https://bottosson.github.io/posts/oklab/

/**
 * Chroma below this is gray: what parses from a gray hex has float noise in it, with a hue of no
 * meaning.
 */
const GRAY = 1e-4

export function normalizeHue(h: number): number {
    return ((h % 360) + 360) % 360
}

function toLinear(v: number): number {
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

function fromLinear(v: number): number {
    return v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
}

/** From sRGB channels between 0 and 1. */
export function fromRgb(r: number, g: number, b: number, alpha: number): Color {
    r = toLinear(r)
    g = toLinear(g)
    b = toLinear(b)
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
    const c = Math.hypot(A, B)
    return {
        alpha,
        c: c < GRAY ? 0 : c,
        h: c < GRAY ? 0 : normalizeHue(Math.atan2(B, A) * 180 / Math.PI),
        l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    }
}

/** To sRGB channels between 0 and 1, what lies outside of sRGB is clipped. */
export function toRgb(color: Color): [r: number, g: number, b: number] {
    const h = color.h * Math.PI / 180
    const A = color.c * Math.cos(h)
    const B = color.c * Math.sin(h)
    const l = (color.l + 0.3963377774 * A + 0.2158037573 * B) ** 3
    const m = (color.l - 0.1055613458 * A - 0.0638541728 * B) ** 3
    const s = (color.l - 0.0894841775 * A - 1.291485548 * B) ** 3
    return [
        clamp(fromLinear(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), 0, 1),
        clamp(fromLinear(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), 0, 1),
        clamp(fromLinear(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s), 0, 1),
    ]
}
