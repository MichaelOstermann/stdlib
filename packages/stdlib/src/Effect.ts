/* eslint-disable @typescript-eslint/no-redeclare -- Effect is a type and what creates it */
import type { MaybeDisposerValue } from "./Disposer"
import type { Memo as MemoType } from "./Memo"
import type { ReadonlySignal } from "./Signal"
import { Disposer } from "./Disposer"
import { brand } from "./internals/disposers"
import { pauseTracking, resumeTracking } from "./internals/reactivity"
import { RawEffect } from "./internals/system"
import { Memo } from "./Memo"

/** Something that runs again when what it read changes, until it is disposed. */
export interface Effect extends Disposer {}

export interface WatchOptions<T> {
    /** Whether two values are the same, for `computation` to not be called. Only asked when they are not `===`, and only for a function: a signal or a memo has its own. */
    equals?: (before: T, after: T) => boolean
}

/**
 * `Effect(computation)`
 *
 * Calls `computation` with the effect itself, and again whenever a signal or memo changes that it read. It is what brings changes to the outside: the DOM, a request, a log.
 *
 * - it runs right away, and again once the batch is done in which something changed
 * - what `computation` returns is cleaned up before the next run and when the effect is disposed: a function, or anything disposable
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
 * Effect((effect) => {
 *     if ($done()) return effect.dispose();
 *     const timer = setInterval(tick, $delay());
 *     return () => clearInterval(timer);
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
    (computation: (effect: Effect) => MaybeDisposerValue): Effect
    /** Runs an effect until it calls `resolve` or `reject`, and returns a promise of that. It is disposed afterwards. */
    defer: <T = void>(computation: (resolve: (value: T) => void, reject: (reason?: unknown) => void, effect: Effect) => MaybeDisposerValue) => Promise<T>
    /**
     * Calls `computation` with the value of `dependencies` and the one before, whenever it changed.
     * Unlike an effect it does not run right away, and does not depend on what `computation` reads.
     * What `computation` returns is cleaned up like it is for an effect, which it is, and what it is called with last.
     */
    watch: <T>(dependencies: ReadonlySignal<T> | MemoType<T> | (() => T), computation: (next: NoInfer<T>, prev: NoInfer<T>, effect: Effect) => MaybeDisposerValue, options?: WatchOptions<NoInfer<T>>) => Effect
} = Object.assign(create, {
    defer,
    watch,
})

function create(computation: (effect: Effect) => MaybeDisposerValue): Effect {
    const effect: Effect = Disposer()
    let cleanup: MaybeDisposerValue

    const clean = (): void => {
        const value = cleanup
        cleanup = undefined
        cleanUp(value)
    }

    const raw = new RawEffect(() => {
        clean()
        if (effect.disposed) return
        cleanup = computation(effect)
        if (effect.disposed) clean()
    })

    raw.run()
    effect.onDispose(() => raw.dispose())
    effect.onDispose(clean)

    return effect
}

/** Disposes what a run returned, without depending on what that reads. An effect that runs or is disposed batches already. */
function cleanUp(value: MaybeDisposerValue): void {
    if (!value) return
    pauseTracking()
    try {
        // An emitter is a function as well, and not one to call.
        if (typeof value === "function" && !(brand in value)) value()
        else (value as Disposable)[Symbol.dispose]()
    }
    finally {
        resumeTracking()
    }
}

function defer<T = void>(computation: (resolve: (value: T) => void, reject: (reason?: unknown) => void, effect: Effect) => MaybeDisposerValue): Promise<T> {
    let effect: Effect | undefined
    return new Promise<T>((resolve, reject) => {
        effect = create(effect => computation(resolve, reject, effect))
        // Disposed for another reason than being done: nothing is going to resolve it anymore.
        effect.onDispose(reject)
    }).finally(() => effect?.dispose())
}

function watch<T>(dependencies: ReadonlySignal<T> | MemoType<T> | (() => T), computation: (next: T, prev: T, effect: Effect) => MaybeDisposerValue, options?: WatchOptions<T>): Effect {
    const effect: Effect = Disposer()
    // A function is turned into a memo, to only run when it returns something else.
    const read = "kind" in dependencies ? dependencies : Memo(dependencies, options)
    let cleanup: MaybeDisposerValue
    let init = false
    let value: T

    const clean = (): void => {
        const value = cleanup
        cleanup = undefined
        cleanUp(value)
    }

    const raw = new RawEffect(() => {
        const prev = value
        value = read()
        if (!init || effect.disposed) return void (init = true)
        pauseTracking()
        try {
            clean()
            if (effect.disposed) return
            cleanup = computation(value, prev, effect)
            if (effect.disposed) clean()
        }
        finally {
            resumeTracking()
        }
    })

    raw.run()
    effect.onDispose(() => raw.dispose())
    effect.onDispose(clean)

    return effect
}
