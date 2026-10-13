import type { ReadonlySignal } from "@monstermann/stdlib"
import type { Rect } from "../Rect"
import { Signal } from "@monstermann/stdlib"
import { isEqual } from "../Rect/isEqual"

/**
 * A rect that is kept up to date while a memo or an effect depends on it.
 * Without one, every read calls `measure`, so a read is never stale.
 */
export function sensor(measure: () => Rect, observe: (set: (rect: Rect) => void) => () => void): ReadonlySignal<Rect> {
    let isWatched = false

    const $rect = Signal(measure(), {
        equals: isEqual,
        onRead() {
            if (!isWatched) $rect(measure())
        },
        onWatch() {
            isWatched = true
            const stop = observe($rect)
            return () => {
                isWatched = false
                stop()
            }
        },
    })

    return $rect
}
