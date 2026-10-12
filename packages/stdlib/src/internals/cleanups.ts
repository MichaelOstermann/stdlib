import type { Disposer, MaybeDisposerValue } from "../Disposer"
import { Disposer as createDisposer } from "../Disposer"

/** Holds the cleanups of the current run, the disposer is only created when there are any. */
export interface Cleanups {
    current: Disposer | undefined
}

let active: Cleanups | undefined

/** Makes `next` what cleanups are added to, and returns what they were added to before. */
export function swapCleanups(next: Cleanups | undefined): Cleanups | undefined {
    const prev = active
    active = next
    return prev
}

export function addCleanup<T extends MaybeDisposerValue>(cleanups: Cleanups, value: T): T {
    if (value) (cleanups.current ??= createDisposer()).onDispose(value)
    return value
}

export function runCleanups(cleanups: Cleanups): void {
    const current = cleanups.current
    if (current === undefined) return
    cleanups.current = undefined
    current.dispose()
}

export function onCleanup<T extends MaybeDisposerValue>(value: T): T {
    return active ? addCleanup(active, value) : value
}
