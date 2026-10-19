/* eslint-disable @typescript-eslint/no-redeclare -- Popover is a type and the component that renders it */
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
 * - render it behind `mounted &&`: without that, the children are created and diffed on every render of the owner, and the element is there while closed
 * - the element has the classes `modal popover`, and `data-status` with `closed`, `opening`, `opened` or `closing`
 * - it is hidden until it has been measured and placed; it renders again when it moves and on each status, the owner does not
 * - `max-height` is the room on the side it opens to. For the content to scroll inside of it, the element is a flex column and what scrolls has `min-height: 0` and `overflow-y: auto`: `className="flex flex-col"` and `<div className="min-h-0 overflow-y-auto">`. A header next to it stays where it is
 * - clicks, context menus and pointer downs inside of it do not reach the React parents of the popover, which React would otherwise pass them to through the portal
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
