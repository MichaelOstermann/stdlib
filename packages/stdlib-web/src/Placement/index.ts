import type { Rect } from "../Rect"
import { create } from "./create"
import { popover } from "./popover"
import { room } from "./room"
import { tooltip } from "./tooltip"

/**
 * Decides where a floating element goes, next to its anchor and inside its boundary.
 * `Placement.popover` and `Placement.tooltip` are two placements. The caret of an editor could use
 * another.
 */
export type Placement = (measurements: PlacementMeasurements, options?: PlacementOptions) => PlacementPosition

/**
 * The side of the anchor first, then the direction along that side. `down-left` is below the anchor
 * and moved to the left, so the right edges line up.
 */
export type PlacementName =
    | `${"down" | "up"}-${"center" | "left" | "right"}`
    | `${"left" | "right"}-${"center" | "down" | "up"}`

export interface PlacementMeasurements {
    /**
     * What the floating rect is placed next to: an element, the point of a mouse event, a caret.
     */
    readonly anchor: Rect
    /**
     * The area the floating rect has to stay in. Usually the size of the window, from
     * `DOM.observeSize(window, onChange)`.
     */
    readonly boundary: Rect
    /** The size of the floating element. Its position is ignored. */
    readonly floating: Rect
}

export interface PlacementOptions {
    /** Distance between anchor and floating rect. `4` by default. */
    readonly anchorGap?: number
    /** Distance between floating rect and the edges of the boundary. `10` by default. */
    readonly boundaryGap?: number
}

export interface PlacementPosition {
    /** Whether the floating rect fits next to the anchor without being cut. */
    readonly fits: boolean
    readonly left: number
    /** The height of the room on the chosen side. Use it for `max-height`. */
    readonly maxHeight: number
    /** The point of the anchor, relative to the floating rect. Use it for `transform-origin`. */
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
