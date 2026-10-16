import type { ComponentProps, ReactNode } from "react"
import type { TooltipModal } from "./useTooltip"
import { createPortal } from "react-dom"
import { floatingStyle } from "./internals/floatingStyle"
import { useSignal } from "./useSignal"

export interface TooltipProps extends Omit<ComponentProps<"div">, "ref"> {
    tooltip: TooltipModal
}

/**
 * `<Tooltip tooltip={tooltip}>`
 *
 * Renders a tooltip from `useTooltip` into `document.body`, next to its trigger.
 *
 * - render it behind `mounted &&`: without that, the children are created and diffed on every render of the owner, and the element is there while closed
 * - the element has the classes `modal tooltip`, and `data-status` with `closed`, `opening`, `opened` or `closing`
 * - it is hidden until it has been measured and placed; it renders again when it moves and on each status, the owner does not
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
    const status = useSignal($status)
    const position = useSignal($position)
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
