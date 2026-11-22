import type { ComponentProps, ReactNode, SyntheticEvent } from "react"
import type { AnchoredModal } from "./internals/useAnchoredModal"
import { createPortal } from "react-dom"
import { floatingStyle } from "./internals/floatingStyle"
import { useReactive } from "./useReactive"

/** What `usePopover` returns as `popover`, for `<Popover popover={popover}>`. */
export type Popover = AnchoredModal<"popover">

export interface PopoverProps extends Omit<ComponentProps<"div">, "popover" | "ref"> {
    popover: Popover
}

/**
 * `<Popover popover={popover}>`
 *
 * Renders a popover from `usePopover` into `document.body`, next to its trigger.
 *
 * - render `<Popover>` behind `mounted &&`. Otherwise the children are created and diffed on every
 *   render of the owner, and the element stays in the DOM while closed
 * - the element has the classes `modal popover` and a `data-status` of `closed`, `opening`,
 *   `opened` or `closing`
 * - the element stays hidden until it is measured and placed
 * - `<Popover>` renders again when it moves and when the status changes. The owner does not render
 *   again
 * - `max-height` is the room on the side the popover opens to. To scroll the content inside, make
 *   the element a flex column and give the scrolling part `min-height: 0` and `overflow-y: auto`:
 *   `className="flex flex-col"` and `<div className="min-h-0 overflow-y-auto">`. A header next to
 *   the scrolling part stays in place
 * - clicks, context menus and pointer downs inside the popover do not reach its React parents.
 *   React would otherwise pass these events through the portal
 *
 * ```tsx
 * const [mounted, triggerRef, popover] = usePopover();
 *
 * <button ref={triggerRef}>Due date</button>
 * {mounted && <Popover popover={popover}><Calendar /></Popover>}
 * ```
 */
export function Popover({ children, className, onClick, onContextMenu, onPointerDown, popover, style, ...rest }: PopoverProps): ReactNode {
    // Destructured: React Compiler skips a component that passes `popover.$floating` as `ref`.
    const { $floating, $position, $status } = popover
    const status = useReactive($status)
    const position = useReactive($position)
    const floating = floatingStyle(position)
    floating.maxHeight = position?.maxHeight

    return createPortal(
        <div
            {...rest}
            className={className ? `modal popover ${className}` : "modal popover"}
            data-status={status}
            onClick={stopping(onClick)}
            onContextMenu={stopping(onContextMenu)}
            onPointerDown={stopping(onPointerDown)}
            ref={$floating}
            style={style ? { ...floating, ...style } : floating}
        >
            {children}
        </div>,
        document.body,
    )
}

/** Calls `handler`, then stops the event from reaching the React parents of the portal. */
function stopping<E extends SyntheticEvent>(handler: ((event: E) => void) | undefined): (event: E) => void {
    return (event) => {
        handler?.(event)
        event.stopPropagation()
    }
}
