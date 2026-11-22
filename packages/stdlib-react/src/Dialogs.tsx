import type { ComponentType, ReactNode } from "react"
import type { Dialog } from "./Dialog"
import { Signal } from "@monstermann/stdlib"
import { useEffect } from "react"
import { useModalStack } from "./internals/useModalStack"
import { useMountEffect } from "./useMountEffect"
import { useReactive } from "./useReactive"
import { useSignal } from "./useSignal"
import { useSignalEffect } from "./useSignalEffect"
import { useTransitionStatus } from "./useTransitionStatus"
import { useUnmountEffect } from "./useUnmountEffect"

export interface DialogOptions {
    /** `200` by default. */
    closeDuration?: number
    /** A name for `Modals.onOpen`, `Modals.onClose` or telemetry. Need not be unique. */
    name?: string
    /** `250` by default. */
    openDuration?: number
}

// `meta` is optional for a dialog that needs none: `Dialog<void, R>`.
type OpenArguments<T> = undefined extends T
    ? [meta?: T, options?: DialogOptions]
    : [meta: T, options?: DialogOptions]

interface Entry {
    readonly Component: ComponentType<{ dialog: Dialog<any, any> }>
    readonly id: number
    readonly meta: unknown
    readonly options: DialogOptions
    /** Can be called from several places. Only the first call settles the promise. */
    readonly resolve: (value: unknown) => void
}

const $entries = Signal<readonly Entry[]>([])
let nextId = 0

/**
 * `<Dialogs />`
 *
 * Renders the dialogs opened with `Dialogs.open`. Mount `<Dialogs />` once, inside the providers of
 * the app, so the dialogs get their context.
 *
 * - dialogs opened before `<Dialogs />` mounts show up once it mounts
 * - unmounting `<Dialogs />` closes the open dialogs, and they resolve with `undefined`
 *
 * ```tsx
 * createRoot(root).render(
 *     <Providers>
 *         <App />
 *         <Dialogs />
 *     </Providers>,
 * );
 * ```
 */
export function Dialogs(): ReactNode {
    const entries = useReactive($entries)
    return entries.map((entry) => <DialogEntry entry={entry} key={entry.id} />)
}

/**
 * # open
 *
 * Opens a dialog that renders `Component` with a `dialog` prop. Resolves with the value that
 * `Component` passes to `dialog.done`. `meta` becomes `dialog.meta`.
 *
 * - `meta` can be left out for a `Dialog<void, R>`
 * - a click outside of the dialog or Esc closes the dialog and resolves with `undefined`
 * - the promise resolves when the dialog starts closing
 * - the dialog unmounts after `closeDuration`
 * - opening a component that is already open opens a second dialog
 *
 * ```tsx
 * const name = await Dialogs.open(Rename, { name: task.name }, { name: "rename" });
 * if (name !== undefined) rename(task, name);
 *
 * await Dialogs.open(Shortcuts);
 * ```
 */
function open<T, R>(
    Component: ComponentType<{ dialog: Dialog<T, R> }>,
    ...[meta, options = {}]: OpenArguments<T>
): Promise<R | undefined> {
    return new Promise((resolve) => {
        const entry: Entry = { Component, id: nextId++, meta, options, resolve: resolve as (value: unknown) => void }
        $entries((entries) => [...entries, entry])
    })
}

Dialogs.open = open

function DialogEntry({ entry }: { entry: Entry }): ReactNode {
    const { Component, meta, options, resolve } = entry
    const { closeDuration = 200, name, openDuration = 250 } = options
    const [mounted, { $open, $status }] = useTransitionStatus({ closeDuration, openDuration })
    const $floating = useSignal<Element | null>(null)
    const $trigger = useSignal<Element | null>(null)

    // The stack identifies modals by object identity. React Compiler keeps this object for as long as the entry.
    const dialog: Dialog<unknown, unknown> = {
        $floating,
        $open,
        $status,
        $trigger,
        kind: "dialog",
        meta,
        name,
        done: (value) => {
            resolve(value)
            $open(false)
        },
    }

    useMountEffect(() => {
        $open(true)
    })

    // Resolves with `undefined` when the dialog closes without `done`, and does nothing after `done`.
    // Triggered by `closing` instead of `$open`: `<StrictMode>` runs effect cleanups once more while the dialog is open.
    useSignalEffect(() => {
        if ($status() === "closing") resolve(undefined)
    })

    useModalStack(dialog)

    // Resolves too, which does nothing after `done` or `closing`. A dialog closed before `opening` never reaches `closing`, and this call resolves it.
    const remove = () => {
        resolve(undefined)
        $entries((entries) => entries.filter((other) => other !== entry))
    }

    // Removed once the closing transition ends and `mounted` turns `false`.
    useEffect(() => {
        if (!mounted) return
        return remove
    }, [mounted, remove])

    // Also removed when `<Dialogs />` unmounts, even before `mounted` turns `true`. The `<StrictMode>` remount does not count.
    useUnmountEffect(remove)

    return mounted && <Component dialog={dialog} />
}
