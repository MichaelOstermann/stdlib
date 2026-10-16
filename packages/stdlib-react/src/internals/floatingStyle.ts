import type { PlacementPosition } from "@monstermann/stdlib-web"
import type { CSSProperties } from "react"

/** Puts a floating element at its position, hidden until it has one. */
export function floatingStyle(position: PlacementPosition | undefined): CSSProperties {
    return {
        left: 0,
        position: "fixed",
        top: 0,
        transform: position && `translate(${position.left}px, ${position.top}px)`,
        transformOrigin: position && `${position.originX}px ${position.originY}px`,
        visibility: position ? undefined : "hidden",
    }
}
