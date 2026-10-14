import type { PlacementMeasurements, PlacementOptions, PlacementPosition } from "."
import { create } from "./create"

/**
 * # tooltip
 *
 * ```ts
 * function Placement.tooltip(measurements: PlacementMeasurements, options?: PlacementOptions): PlacementPosition
 * ```
 *
 * Centered below the anchor, and above when it does not fit below.
 *
 * ## Example
 *
 * ```ts
 * const position = Placement.tooltip({ anchor, boundary, floating });
 * ```
 */
export function tooltip(measurements: PlacementMeasurements, options?: PlacementOptions): PlacementPosition {
    const down = create("down-center", measurements, options)
    return down.fits ? down : create("up-center", measurements, options)
}
