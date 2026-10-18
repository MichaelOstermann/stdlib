import type { ComponentType, ReactNode } from "react"
import type { Dialog } from "./Dialog"
import { Signal } from "@monstermann/stdlib"
import { useEffect } from "react"
import { useCreateEffect } from "./internals/useCreateEffect"
import { useCreateSignal } from "./internals/useCreateSignal"
import { Modals } from "./Modals"
import { useMountEffect } from "./useMountEffect"
import { useSignal } from "./useSignal"
import { useTransitionStatus } from "./useTransitionStatus"
import { useUnmountEffect } from "./useUnmountEffect"

export interface DialogOptions {
    /** `200` by default. */
    closeDuration?: number
    /** For `Modals.onOpen` and `Modals.onClose`, or telemetry. Need not be unique. */
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
    readonly resolve: (value: unknown) => void
}

const $entries = Signal<readonly Entry[]>([])
let nextId = 0

/**
 * `<Dialogs />`
 *
 * Renders the dialogs opened with `Dialogs.open`. Mounted once, inside the providers of the app, for the dialogs to have their context.
 *
 * - dialogs opened while it is not mounted show once it is
 * - unmounting it closes the open dialogs, which resolve with `undefined`
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
    const entries = useSignal($entries)
    return entries.map(entry => <DialogEntry entry={entry} key={entry.id} />)
}

/**
 * # open
 *
 * ```ts
 * function Dialogs.open<T, R>(
 *     Component: ComponentType<{ dialog: Dialog<T, R> }>,
 *     meta?: T,
 *     options?: DialogOptions,
 * ): Promise<R | undefined>
 * ```
 *
 * Opens a dialog that renders `Component` with `dialog`, and resolves with what it passes to `dialog.done`. `meta` is `dialog.meta`.
 *
 * - `meta` can be left out for a `Dialog<void, R>`
 * - a click outside of the dialog and Esc close it, and it resolves with `undefined`
 * - resolves once it starts closing, and unmounts once `closeDuration` has passed
 * - opening a component that is open already opens it a second time
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
        $entries(entries => [...entries, entry])
    })
}

Dialogs.open = open

function DialogEntry({ entry }: { entry: Entry }): ReactNode {
    const { Component, meta, options, resolve } = entry
    const { closeDuration = 200, name, openDuration = 250 } = options
    const [mounted, { $open, $status }] = useTransitionStatus({ closeDuration, openDuration })
    const $floating = useCreateSignal<Element | null>(null)
    const $trigger = useCreateSignal<Element | null>(null)

    // The stack knows the dialog by this object, React Compiler keeps it for as long as the entry.
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

    // Resolves with `undefined` when it closes without `done`. After `done` it is resolved already.
    // From `closing` and not from `$open`: `<StrictMode>` runs the cleanups of the first effects once more, while the dialog is open.
    useCreateEffect(() => {
        if ($status() === "closing") resolve(undefined)
    })

    // On the stack while open and rendered.
    useCreateEffect(() => {
        if (!$open() || !$floating()) return
        Modals.open(dialog)
        return () => Modals.close(dialog)
    })

    // Resolves the dialog as well: after `done` that does nothing, after closing within the two frames before `opening` it is what resolves it.
    const remove = () => {
        resolve(undefined)
        $entries(entries => entries.filter(other => other !== entry))
    }

    // Gone once closed.
    useEffect(() => {
        if (!mounted) return
        return remove
    }, [mounted, remove])

    // Gone when `<Dialogs />` unmounts, also before `mounted` is true. Not on the unmount and mount again of `<StrictMode>`.
    useUnmountEffect(remove)

    return mounted && <Component dialog={dialog} />
}
