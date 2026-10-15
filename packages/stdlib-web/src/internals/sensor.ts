import type { Disposer, ReadonlySignal } from "@monstermann/stdlib"
import type { Rect } from "../Rect"
import { Signal } from "@monstermann/stdlib"
import { isEqual } from "../Rect/isEqual"
import { origin } from "../Rect/origin"

/**
 * A rect that is kept up to date while a memo or an effect depends on it.
 * Without one, every read calls `measure`, so a read is never stale.
 */
export function sensor(measure: () => Rect, observe: (set: (rect: Rect) => void) => Disposer): ReadonlySignal<Rect> {
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
                stop.dispose()
            }
        },
    })

    return $rect
}

let $origin: ReadonlySignal<Rect> | undefined

/** The signal for a target that does not exist: always `Rect.origin`. */
export function nothing(): ReadonlySignal<Rect> {
    return $origin ??= Signal(origin)
}
