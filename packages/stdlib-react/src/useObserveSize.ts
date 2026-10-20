import type { Rect } from "@monstermann/stdlib-web"
import { DOM } from "@monstermann/stdlib-web"
import { useLayoutEffect } from "react"
import { useLatest } from "./internals/useLatest"

/**
 * `useObserveSize(target, onChange)`
 *
 * `DOM.observeSize` for as long as the component is mounted: calls `onChange` with the size of `target` right away, and again whenever it changes.
 *
 * - the first call is before the browser paints, for a position that depends on the size
 * - observes again when `target` changes, and nothing while it is `null`; a new `onChange` does not observe again
 * - `onChange` can be a signal: `useObserveSize(element, $size)`
 *
 * ```tsx
 * function Slide({ onHeight }: { onHeight: (height: number) => void }) {
 *     const [element, setElement] = useState<HTMLElement | null>(null);
 *     useObserveSize(element, size => onHeight(size.height));
 *     return <div ref={setElement} />;
 * }
 *
 * function Menu() {
 *     const [element, setElement] = useState<HTMLElement | null>(null);
 *     const [size, setSize] = useState(Rect.origin);
 *     useObserveSize(element, setSize);
 * }
 * ```
 */
export function useObserveSize(target: Element | Window | null | undefined, onChange: (size: Rect) => void): void {
    const latest = useLatest(onChange)

    useLayoutEffect(() => {
        if (!target) return
        return DOM.observeSize(target, (size) => latest.current(size))
    }, [target, latest])
}
