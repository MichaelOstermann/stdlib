import type { PlacementMeasurements } from "."
import { centerX } from "../Rect/centerX"
import { centerY } from "../Rect/centerY"

/**
 * # room
 *
 * ```ts
 * function Placement.room(measurements: Pick<PlacementMeasurements, "anchor" | "boundary">): {
 *     vertical: "up" | "down";
 *     horizontal: "left" | "right";
 * }
 * ```
 *
 * Tells which side of the anchor has more room inside the boundary, by comparing the center of the anchor with the center of the boundary.
 * A tie goes to `down` and `right`.
 *
 * ## Example
 *
 * ```ts
 * const room = Placement.room(measurements);
 * const position = Placement.create(room.vertical === "up" ? "up-center" : "down-center", measurements);
 * ```
 */
export function room(measurements: Pick<PlacementMeasurements, "anchor" | "boundary">): { horizontal: "left" | "right", vertical: "down" | "up" } {
    const { anchor, boundary } = measurements
    return {
        horizontal: centerX(anchor) > centerX(boundary) ? "left" : "right",
        vertical: centerY(anchor) > centerY(boundary) ? "up" : "down",
    }
}
