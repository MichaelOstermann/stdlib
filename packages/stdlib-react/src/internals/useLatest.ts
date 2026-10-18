import type { RefObject } from "react"
import { useLayoutEffect, useRef } from "react"

/** A ref to `value` of the last committed render, for a listener that should not start over when `value` changes. */
export function useLatest<T>(value: T): RefObject<T> {
    const ref = useRef(value)
    useLayoutEffect(() => {
        ref.current = value
    })
    return ref
}
