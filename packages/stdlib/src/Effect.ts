/* eslint-disable @typescript-eslint/no-redeclare -- Effect is a type and what creates it */
import type { MaybeDisposerValue } from "./Disposer"
import type { Cleanups } from "./internals/cleanups"
import type { Memo as MemoType } from "./Memo"
import type { ReadonlySignal } from "./Signal"
import { Disposer } from "./Disposer"
import { addCleanup, onCleanup, runCleanups, swapCleanups } from "./internals/cleanups"
import { pauseTracking, resumeTracking } from "./internals/reactivity"
import { RawEffect } from "./internals/system"
import { Memo } from "./Memo"

/** Something that runs again when what it read changes, until it is disposed. */
export interface Effect extends Disposer {}

export interface WatchOptions<T> {
    /** Whether two values are the same, for `computation` to not be called. Only asked when they are not `===`, and only for a function: a signal or a memo has its own. */
    equals?: (before: T, after: T) => boolean
}

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
 *
 * // Only what the first function reads is depended on, and nothing runs until that changed.
 * Effect.watch($count, (count, before) => console.log(before, count));
 * Effect.watch(() => $count() > 10, (isLarge) => $size(isLarge ? "large" : "small"));
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
    /**
     * Calls `computation` with the value of `dependencies` and the one before, whenever it changed.
     * Unlike an effect it does not run right away, and does not depend on what `computation` reads.
     * Cleanups and disposing work like they do for an effect, which it is: `Effect.current()` returns it while it runs.
     */
    watch: <T>(dependencies: ReadonlySignal<T> | MemoType<T> | (() => T), computation: (next: NoInfer<T>, prev: NoInfer<T>) => MaybeDisposerValue, options?: WatchOptions<NoInfer<T>>) => Effect
} = Object.assign(create, {
    defer,
    onCleanup,
    watch,
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

function watch<T>(dependencies: ReadonlySignal<T> | MemoType<T> | (() => T), computation: (next: T, prev: T) => MaybeDisposerValue, options?: WatchOptions<T>): Effect {
    const cleanups: Cleanups = { current: undefined }
    const effect: Effect = Disposer()
    // A function is turned into a memo, to only run when it returns something else.
    const read = "kind" in dependencies ? dependencies : Memo(dependencies, options)
    let init = false
    let value: T

    const raw = new RawEffect(() => {
        const prev = value
        const prevEffect = current
        // What reading the dependencies cleans up belongs to nothing.
        const prevCleanups = swapCleanups(undefined)
        current = effect
        try {
            value = read()
            if (!init || effect.disposed) return void (init = true)
            pauseTracking()
            try {
                runCleanups(cleanups)
                swapCleanups(cleanups)
                if (effect.disposed) return
                addCleanup(cleanups, computation(value, prev))
                if (effect.disposed) runCleanups(cleanups)
            }
            finally {
                resumeTracking()
            }
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
