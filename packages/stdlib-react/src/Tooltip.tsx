import type { ComponentProps, ReactNode } from "react"
import type { AnchoredModal } from "./internals/useAnchoredModal"
import { createPortal } from "react-dom"
import { floatingStyle } from "./internals/floatingStyle"
import { useReactive } from "./useReactive"

/** What `useTooltip` returns as `tooltip`, for `<Tooltip tooltip={tooltip}>`. */
export type Tooltip = AnchoredModal<"tooltip">

export interface TooltipProps extends Omit<ComponentProps<"div">, "ref"> {
    tooltip: Tooltip
}

/**
 * `<Tooltip tooltip={tooltip}>`
 *
 * Renders a tooltip from `useTooltip` into `document.body`, next to its trigger.
 *
 * - render `<Tooltip>` behind `mounted &&`. Otherwise the children are created and diffed on every
 *   render of the owner, and the element stays in the DOM while closed
 * - the element has the classes `modal tooltip` and a `data-status` of `closed`, `opening`,
 *   `opened` or `closing`
 * - the element stays hidden until it is measured and placed
 * - `<Tooltip>` renders again when it moves and when the status changes. The owner does not render
 *   again
 *
 * ```tsx
 * const [mounted, triggerRef, tooltip] = useTooltip();
 *
 * <button ref={triggerRef}>Search</button>
 * {mounted && <Tooltip tooltip={tooltip}>Search tasks</Tooltip>}
 * ```
 */
export function Tooltip({ children, className, style, tooltip, ...rest }: TooltipProps): ReactNode {
    // Destructured: React Compiler skips a component that passes `tooltip.$floating` as `ref`.
    const { $floating, $position, $status } = tooltip
    const status = useReactive($status)
    const position = useReactive($position)
    const floating = floatingStyle(position)

    return createPortal(
        <div
            {...rest}
            className={className ? `modal tooltip ${className}` : "modal tooltip"}
            data-status={status}
            ref={$floating}
            role="tooltip"
            style={style ? { ...floating, ...style } : floating}
        >
            {children}
        </div>,
        document.body,
    )
}
