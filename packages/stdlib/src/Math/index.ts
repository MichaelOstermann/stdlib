import { replica } from "../internals/replica"
import { clamp } from "./clamp"
import { roundTo } from "./roundTo"

/**
 * The native `Math`, with the functions of `@monstermann/stdlib` added: `Math.clamp`, …
 *
 * `Math.max()` and the native members behave as they always do.
 */
export const Math = replica(globalThis.Math, {
    clamp,
    roundTo,
})
