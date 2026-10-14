/* eslint-disable @typescript-eslint/no-redeclare -- Placement is a type and the functions that make one */
import type { Rect } from "../Rect"
import { create } from "./create"
import { popover } from "./popover"
import { room } from "./room"
import { tooltip } from "./tooltip"

/** Where a floating element goes, next to its anchor and inside its boundary. `Placement.popover` and `Placement.tooltip` are two, the caret of an editor can be another. */
export type Placement = (measurements: PlacementMeasurements, options?: PlacementOptions) => PlacementPosition

/**
 * The side of the anchor first, then the way the floating rect is moved along that side:
 * `down-left` is below the anchor and moved to the left, which lines up the right edges.
 */
export type PlacementName =
    | `${"down" | "up"}-${"center" | "left" | "right"}`
    | `${"left" | "right"}-${"center" | "down" | "up"}`

export interface PlacementMeasurements {
    /** What the floating rect is placed next to: an element, the point of a mouse event, a caret. */
    readonly anchor: Rect
    /** The area the floating rect has to stay in, usually `DOM.observeSize(window)`. */
    readonly boundary: Rect
    /** The size of the floating element. Its position is ignored. */
    readonly floating: Rect
}

export interface PlacementOptions {
    /** Distance between anchor and floating rect, `4` by default. */
    readonly anchorGap?: number
    /** Distance between floating rect and the edges of the boundary, `10` by default. */
    readonly boundaryGap?: number
}

export interface PlacementPosition {
    /** Whether the floating rect fits next to the anchor without being cut. */
    readonly fits: boolean
    readonly left: number
    /** The height of the room on the chosen side, for `max-height`. */
    readonly maxHeight: number
    /** The point of the anchor, relative to the floating rect, for `transform-origin`. */
    readonly originX: number
    readonly originY: number
    readonly top: number
}

export const Placement = {
    create,
    popover,
    room,
    tooltip,
}
