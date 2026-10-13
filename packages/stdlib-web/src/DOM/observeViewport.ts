import type { ReadonlySignal } from "@monstermann/stdlib"
import type { Rect } from "../Rect"
import { sensor } from "../internals/sensor"
import { fromWindow } from "../Rect/fromWindow"

let $viewport: ReadonlySignal<Rect> | undefined

/**
 * # observeViewport
 *
 * ```ts
 * function DOM.observeViewport(): ReadonlySignal<Rect>
 * ```
 *
 * Returns the size of the viewport as a signal: a rect at `0, 0` with `innerWidth` and `innerHeight`.
 * Every call returns the same signal.
 *
 * - `resize` is only listened to while a memo or an effect depends on the signal
 * - a read outside of a memo or an effect measures the viewport right away
 *
 * ## Example
 *
 * ```ts
 * const $boundary = Memo(() => Rect.shrink(DOM.observeViewport()(), 10));
 * ```
 */
export function observeViewport(): ReadonlySignal<Rect> {
    return $viewport ??= sensor(fromWindow, (set) => {
        const controller = new AbortController()
        set(fromWindow())
        window.addEventListener("resize", () => set(fromWindow()), { passive: true, signal: controller.signal })
        return () => controller.abort()
    })
}
