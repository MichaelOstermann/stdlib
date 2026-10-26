import type { Ref } from "react"

/**
 * `mergeRefs(...refs)`
 *
 * One ref for several: each of `refs` gets the value once attached, and is cleaned up once
 * detached.
 *
 * - a callback ref that returns a cleanup has that cleanup called, the others are called with
 *   `null`, an object ref is set to `null`
 * - `undefined` and `null` are skipped, a single ref is returned as is
 * - a plain function, not a hook: React Compiler keeps the merged ref the same while `refs` are
 * - a `useState` setter and a signal are callback refs: `mergeRefs(setElement, $element)`
 *
 * ```tsx
 * function Input({ ref }: { ref?: Ref<HTMLInputElement> }) {
 *     const [element, setElement] = useState<HTMLInputElement | null>(null);
 *     return <input ref={mergeRefs(ref, setElement)} />;
 * }
 * ```
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
