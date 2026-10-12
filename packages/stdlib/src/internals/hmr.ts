import type { Disposer } from "../Disposer"

/** What `@monstermann/stdlib-transform` passes as the last argument to effects and emitters during development. */
export interface Meta {
    /** Callbacks that are called and removed when the module is replaced. */
    readonly hmr?: Set<() => void>
}

/** Disposes `target` when its module is replaced, for what the new one creates to not run next to it. */
export function hmr(target: Disposer, meta: Meta | undefined): void {
    const callbacks = meta?.hmr
    if (!callbacks) return
    const dispose = target.dispose
    callbacks.add(dispose)
    target.onDispose(() => callbacks.delete(dispose))
}
