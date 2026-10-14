import type { PlacementMeasurements, PlacementName, PlacementOptions, PlacementPosition } from "."
import type { Rect } from "../Rect"
import { roundByDPR } from "../DOM/roundByDPR"

/**
 * # create
 *
 * ```ts
 * function Placement.create(
 *     name: PlacementName,
 *     measurements: PlacementMeasurements,
 *     options?: PlacementOptions,
 * ): PlacementPosition
 * ```
 *
 * Places the floating rect on one side of the anchor and keeps it inside the boundary.
 * The name is the side first, then the way the floating rect is moved along it: `down-left` is below the anchor and moved to the left, which lines up the right edges.
 *
 * - the floating rect is pushed back inside the boundary, it does not change sides
 * - `fits` is `false` when the room on that side is smaller than the floating rect, which is the moment to try another side
 * - `left` and `top` are rounded to device pixels
 *
 * ## Example
 *
 * ```ts
 * const measurements = {
 *     anchor: { left: 100, top: 100, width: 80, height: 20 },
 *     boundary: { left: 0, top: 0, width: 800, height: 600 },
 *     floating: { left: 0, top: 0, width: 200, height: 100 },
 * };
 *
 * Placement.create("down-center", measurements);
 * // { left: 40, top: 124, originX: 100, originY: 0, maxHeight: 466, fits: true }
 *
 * // Below if it fits, above otherwise:
 * const down = Placement.create("down-center", measurements);
 * const position = down.fits ? down : Placement.create("up-center", measurements);
 * ```
 */
export function create(name: PlacementName, measurements: PlacementMeasurements, options: PlacementOptions = {}): PlacementPosition {
    const { anchor, boundary, floating } = measurements
    const { anchorGap = 4, boundaryGap = 10 } = options
    const [side, shift] = name.split("-") as [string, string]
    const vertical = side === "down" || side === "up"

    // The main axis leads away from the anchor, the cross axis runs along it.
    const [anchorStart, anchorEnd] = span(anchor, vertical)
    const [crossAnchorStart, crossAnchorEnd] = span(anchor, !vertical)
    const [boundaryStart, boundaryEnd] = span(boundary, vertical, boundaryGap)
    const [crossBoundaryStart, crossBoundaryEnd] = span(boundary, !vertical, boundaryGap)
    const size = vertical ? floating.height : floating.width
    const crossSize = vertical ? floating.width : floating.height

    // The room between anchor and boundary edge on the chosen side.
    const after = side === "down" || side === "right"
    const roomStart = after ? Math.clamp(anchorEnd + anchorGap, boundaryStart, boundaryEnd) : boundaryStart
    const roomEnd = after ? boundaryEnd : Math.clamp(anchorStart - anchorGap, boundaryStart, boundaryEnd)
    const room = Math.max(0, roomEnd - roomStart)
    const crossRoom = Math.max(0, crossBoundaryEnd - crossBoundaryStart)

    // The point of the anchor the floating rect lines up with, which is also where it grows from.
    const towardsStart = shift === "left" || shift === "up"
    const point = shift === "center"
        ? (crossAnchorStart + crossAnchorEnd) / 2
        : towardsStart ? crossAnchorEnd : crossAnchorStart
    const wanted = shift === "center"
        ? point - crossSize / 2
        : towardsStart ? point - crossSize : point

    const position = roundByDPR(after ? roomStart : Math.max(roomStart, roomEnd - size))
    // Pushed back inside the boundary, to its start when the floating rect is wider.
    const crossPosition = roundByDPR(Math.max(crossBoundaryStart, Math.min(wanted, crossBoundaryEnd - crossSize)))
    const origin = after ? 0 : roomEnd - position
    const crossOrigin = Math.clamp(point - crossPosition, 0, Math.min(crossSize, crossRoom))

    return {
        fits: size <= room && crossSize <= crossRoom,
        left: vertical ? crossPosition : position,
        maxHeight: vertical ? room : crossRoom,
        originX: vertical ? crossOrigin : origin,
        originY: vertical ? origin : crossOrigin,
        top: vertical ? position : crossPosition,
    }
}

function span(rect: Rect, vertical: boolean, inset = 0): [start: number, end: number] {
    const start = vertical ? rect.top : rect.left
    const size = vertical ? rect.height : rect.width
    return [start + inset, start + size - inset]
}
