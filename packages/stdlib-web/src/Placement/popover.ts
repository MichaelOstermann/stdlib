import type { PlacementMeasurements, PlacementOptions, PlacementPosition } from "."
import { create } from "./create"
import { room } from "./room"

/**
 * # popover
 *
 * ```ts
 * function Placement.popover(measurements: PlacementMeasurements, options?: PlacementOptions): PlacementPosition
 * ```
 *
 * Centered above or below the anchor, on the side with more room.
 * The side does not depend on the size of the popover, so a popover that grows or shrinks stays where it is.
 *
 * ## Example
 *
 * ```ts
 * const position = Placement.popover({ anchor, boundary, floating });
 * ```
 */
export function popover(measurements: PlacementMeasurements, options?: PlacementOptions): PlacementPosition {
    return create(room(measurements).vertical === "up" ? "up-center" : "down-center", measurements, options)
}
