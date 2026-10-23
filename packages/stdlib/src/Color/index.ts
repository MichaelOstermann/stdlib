import { alpha } from "./alpha"
import { darken } from "./darken"
import { desaturate } from "./desaturate"
import { hue } from "./hue"
import { lighten } from "./lighten"
import { mix } from "./mix"
import { oklch } from "./oklch"
import { over } from "./over"
import { parse } from "./parse"
import { rotate } from "./rotate"
import { saturate } from "./saturate"

/** A color in OKLCH: `l` lightness from 0 to 1, `c` chroma from 0 to about 0.4, `h` hue in degrees and `alpha` from 0 to 1. Gray has no chroma, and its hue is ignored. */
export interface Color {
    alpha: number
    c: number
    h: number
    l: number
}

export const Color = {
    alpha,
    darken,
    desaturate,
    hue,
    lighten,
    mix,
    oklch,
    over,
    parse,
    rotate,
    saturate,
}
