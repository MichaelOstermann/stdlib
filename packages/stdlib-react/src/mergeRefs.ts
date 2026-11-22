import type { Ref } from "react"

/**
 * `mergeRefs(...refs)`
 *
 * Combines several refs into one. Each of `refs` gets the element on attach and is cleaned up on
 * detach.
 *
 * - a callback ref that returns a cleanup gets that cleanup called on detach. Other callback refs
 *   are called with `null`. An object ref is set to `null`
 * - `undefined` and `null` are skipped
 * - a single ref is returned as is
 * - `mergeRefs` is a plain function, not a hook. React Compiler keeps the merged ref stable while
 *   `refs` stay the same
 * - a `useState` setter and a signal work as callback refs: `mergeRefs(setElement, $element)`
 */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): Ref<T> {
    const defined = refs.filter((ref) => ref != null)
    if (defined.length <= 1) return defined[0] ?? null
    return (value) => {
        const cleanups = defined.map((ref) => {
            if (typeof ref !== "function") {
                ref.current = value
                return () => (ref.current = null)
            }
            const cleanup = ref(value)
            return typeof cleanup === "function" ? cleanup : () => ref(null)
        })
        return () => cleanups.forEach((cleanup) => cleanup())
    }
}
