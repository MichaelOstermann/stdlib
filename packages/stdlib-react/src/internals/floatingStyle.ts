import type { PlacementPosition } from "@monstermann/stdlib-web"
import type { CSSProperties } from "react"

/** Returns the style that puts a floating element at `position`. Hidden while there is none. */
export function floatingStyle(position: PlacementPosition | undefined): CSSProperties {
    return {
        left: 0,
        position: "fixed",
        top: 0,
        transformOrigin: position && `${position.originX}px ${position.originY}px`,
        translate: position && `${position.left}px ${position.top}px`,
        visibility: position ? undefined : "hidden",
    }
}
