import type { Rect } from "../Rect"
import { isEqual } from "../Rect/isEqual"

/** Wraps `onChange`: rounds each rect to whole pixels, and skips a rect equal to the last one. */
export function roundedAndDeduped(onChange: (rect: Rect) => void): (rect: Rect) => void {
    let last: Rect | undefined
    return (rect) => {
        const next = { height: Math.round(rect.height), left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width) }
        if (last && isEqual(last, next)) return
        onChange(last = next)
    }
}
