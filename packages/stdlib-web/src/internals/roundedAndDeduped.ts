import type { Rect } from "../Rect"
import { isEqual } from "../Rect/isEqual"

/** Wraps `onChange` to be called with a rect in whole pixels, and only when that rect is another than the last one. */
export function onRoundedChange(onChange: (rect: Rect) => void): (rect: Rect) => void {
    let last: Rect | undefined
    return (rect) => {
        const next = { height: Math.round(rect.height), left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width) }
        if (last && isEqual(last, next)) return
        onChange(last = next)
    }
}
