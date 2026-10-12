/* eslint-disable @typescript-eslint/no-redeclare -- Effect is a type and what creates it */
import type { MaybeDisposerValue } from "./Disposer"
import type { Cleanups } from "./internals/cleanups"
import { Disposer } from "./Disposer"
import { addCleanup, onCleanup, runCleanups, swapCleanups } from "./internals/cleanups"
import { RawEffect } from "./internals/system"

/** Something that runs again when what it read changes, until it is disposed. */
export interface Effect extends Disposer {}

let current: Effect | undefined

/**
 * `Effect(computation)`
 *
 * Calls `computation`, and again whenever a signal or memo changes that it read. It is what brings changes to the outside: the DOM, a request, a log.
 *
 * - it runs right away, and again once the batch is done in which something changed
 * - what `computation` returns is cleaned up before the next run and when the effect is disposed, like everything added with `Effect.onCleanup`
 * - it is a `Disposer`: dispose it to stop it, add it to another one to stop it together with that
 * - what `computation` throws is thrown by what created the effect, or by what changed the signal
 *
 * ```ts
 * const $count = Signal(0);
 *
 * const effect = Effect(() => {
 *     console.log($count());
 *     return () => console.log("cleanup");
 * }); // 0
 *
 * $count(1); // "cleanup", 1
 *
 * effect.onDispose(() => console.log("disposed"));
 * effect.dispose(); // "disposed", "cleanup"
 *
 * Effect(() => {
 *     const timer = setInterval(tick, $delay());
 *     Effect.onCleanup(() => clearInterval(timer));
 *     if ($done()) Effect.current()?.dispose();
 * });
 *
 * await Effect.defer<number>((resolve) => {
 *     if ($count() > 10) resolve($count());
 * });
 * ```
 */
export const Effect: {
    (computation: () => MaybeDisposerValue): Effect
    /** The effect that is running, to dispose it from the inside. */
    current: () => Effect | undefined
    /** Runs an effect until it calls `resolve` or `reject`, and returns a promise of that. It is disposed afterwards. */
    defer: <T = void>(computation: (resolve: (value: T) => void, reject: (reason?: unknown) => void) => MaybeDisposerValue) => Promise<T>
    /** Adds something to clean up before the effect that is running runs again, and when it is disposed. Returns it, and ignores it when no effect is running. */
    onCleanup: <T extends MaybeDisposerValue>(value: T) => T
} = Object.assign(create, {
    defer,
    onCleanup,
    current: () => current,
})

function create(computation: () => MaybeDisposerValue): Effect {
    const cleanups: Cleanups = { current: undefined }
    const effect: Effect = Disposer()

    const raw = new RawEffect(() => {
        const prevEffect = current
        const prevCleanups = swapCleanups(cleanups)
        current = effect
        try {
            runCleanups(cleanups)
            if (effect.disposed) return
            addCleanup(cleanups, computation())
            if (effect.disposed) runCleanups(cleanups)
        }
        finally {
            swapCleanups(prevCleanups)
            current = prevEffect
        }
    })

    raw.run()
    effect.onDispose(() => raw.dispose())
    effect.onDispose(() => runCleanups(cleanups))

    return effect
}

function defer<T = void>(computation: (resolve: (value: T) => void, reject: (reason?: unknown) => void) => MaybeDisposerValue): Promise<T> {
    let effect: Effect | undefined
    return new Promise<T>((resolve, reject) => {
        effect = create(() => computation(resolve, reject))
        // Disposed for another reason than being done: nothing is going to resolve it anymore.
        effect.onDispose(reject)
    }).finally(() => effect?.dispose())
}
