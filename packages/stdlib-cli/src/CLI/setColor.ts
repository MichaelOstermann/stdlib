import { color } from "../internals/color"

/** Turns colors on or off, whatever `CLI.hasColor` detected. */
export function setColor(enabled: boolean): void {
    color.enabled = enabled
}
