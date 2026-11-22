import type { RefObject } from "react"
import { useLayoutEffect, useRef } from "react"

/**
 * Returns a ref that holds `value` from the last committed render. A listener reads the current
 * value through the ref without subscribing again.
 */
export function useLatest<T>(value: T): RefObject<T> {
    const ref = useRef(value)
    useLayoutEffect(() => {
        ref.current = value
    })
    return ref
}
