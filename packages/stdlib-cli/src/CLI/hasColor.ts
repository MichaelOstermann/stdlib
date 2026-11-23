import { color, detectColor } from "../internals/color"

/**
 * Whether output has colors. Off for agents, CI and dumb terminals, and when nobody sits at a
 * terminal. `NO_COLOR` turns colors off, `FORCE_COLOR` turns them on. `CLI.setColor` overrides all
 * of these.
 */
export function hasColor(): boolean {
    return color.enabled ??= detectColor()
}
