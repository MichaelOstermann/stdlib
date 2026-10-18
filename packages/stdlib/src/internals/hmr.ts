/** What `@monstermann/stdlib-transform` passes as the last argument to effects and emitters during development. */
export interface Meta {
    /** Callbacks that are called and removed when the module is replaced. */
    readonly hmr?: Set<() => void>
}

/** Calls `dispose` when the module of `meta` is replaced, for what the new one creates to not run next to it. Returns what stops that, for once it is disposed by itself. */
export function hmr(dispose: () => void, meta: Meta | undefined): (() => void) | undefined {
    const callbacks = meta?.hmr
    if (!callbacks) return undefined
    callbacks.add(dispose)
    return () => void callbacks.delete(dispose)
}
