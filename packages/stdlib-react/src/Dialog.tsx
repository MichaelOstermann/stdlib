import type { ReadonlySignal } from "@monstermann/stdlib"
import type { ComponentProps, CSSProperties, ReactNode } from "react"
import type { Modal } from "./Modals"
import type { TransitionStatus } from "./useTransitionStatus"
import { createPortal } from "react-dom"
import { useReactive } from "./useReactive"

/** A dialog opened with `Dialogs.open`, passed to its component as `dialog`: `meta` is what `Dialogs.open` was given, `done` what it resolves with. */
export interface Dialog<T = void, R = void> extends Modal {
    readonly $status: ReadonlySignal<TransitionStatus>
    readonly kind: "dialog"
    /** What `Dialogs.open` was given after the component. */
    readonly meta: T
    /** Closes the dialog, `Dialogs.open` resolves with `value`. */
    readonly done: (value: R) => void
}

export interface DialogProps extends Omit<ComponentProps<"div">, "ref"> {
    // Takes any dialog: every `meta` is `unknown`, and a `done` for anything takes `never`.
    dialog: Dialog<unknown, never>
}

// The backdrop covers the page and centers the dialog. A dialog elsewhere moves itself: `className="self-start mt-40"`.
const backdropStyle: CSSProperties = {
    alignItems: "center",
    display: "flex",
    inset: 0,
    justifyContent: "center",
    position: "fixed",
}

/**
 * `<Dialog dialog={dialog}>`
 *
 * Renders a dialog opened with `Dialogs.open` into `document.body`, over a backdrop that covers the page.
 *
 * - the backdrop has the classes `modal dialog`, a click on it closes the dialog
 * - `className`, `style` and the other props go on the dialog, not on the backdrop: `className="self-start mt-40"` puts it near the top instead of the center
 * - both have `data-status` with `closed`, `opening`, `opened` or `closing`
 *
 * ```tsx
 * function Rename({ dialog }: { dialog: Dialog<{ name: string }, string> }) {
 *     const [value, setValue] = useState(dialog.meta.name);
 *
 *     return (
 *         <Dialog className="w-120" dialog={dialog}>
 *             <input onChange={event => setValue(event.target.value)} value={value} />
 *             <button onClick={() => dialog.done(value)}>Rename</button>
 *         </Dialog>
 *     );
 * }
 * ```
 */
export function Dialog({ children, dialog, ...rest }: DialogProps): ReactNode {
    // Destructured: React Compiler skips a component that passes `dialog.$floating` as `ref`.
    const { $floating, $status } = dialog
    const status = useReactive($status)

    return createPortal(
        <div className="modal dialog" data-status={status} style={backdropStyle}>
            <div aria-modal="true" role="dialog" {...rest} data-status={status} ref={$floating}>
                {children}
            </div>
        </div>,
        document.body,
    )
}
