/* eslint-disable @typescript-eslint/no-redeclare -- Effect is a type and what creates it */
import type { Meta } from "./internals/hmr"
import type { Memo as MemoType } from "./Memo"
import type { ReadonlySignal } from "./Signal"
import { hmr } from "./internals/hmr"
import { pauseTracking, resumeTracking } from "./internals/reactivity"
import { RawEffect } from "./internals/system"
import { Memo } from "./Memo"

/** Something that runs again when what it read changes, until it is disposed. */
export interface Effect {
    /** Stops the effect, and calls the cleanup of its last run. Does nothing the second time. */
    dispose: () => void
}

export interface WatchOptions<T> {
    /** Whether two values are the same, for `computation` to not be called. Only asked when they are not `===`, and only for a function: a signal or a memo has its own. */
    equals?: (before: T, after: T) => boolean
}

/**
 * `Effect(computation)`
 *
 * Calls `computation` with the effect itself, and again whenever a signal or memo changes that it read. Use it to apply changes outside of signals: the DOM, a request, a log.
 *
 * - it runs right away, and again once the batch is done in which something changed
 * - the function that `computation` returns is called before the next run and when the effect is disposed
 * - `dispose` stops it, also from inside of `computation`
 * - what `computation` throws is thrown by what created the effect, or by what changed the signal
 * - during development it is disposed when its module is replaced, the plugin passes the metadata for that as the last argument
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
 * effect.dispose(); // "cleanup"
 *
 * Effect((effect) => {
 *     if ($done()) return effect.dispose();
 *     return Timer.interval($delay(), tick);
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
    (computation: (effect: Effect) => (() => void) | void, meta?: Meta): Effect
    /** Runs an effect until it calls `resolve` or `reject`, and returns a promise of that. It is disposed afterwards. */
    defer: <T = void>(computation: (resolve: (value: T) => void, reject: (reason?: unknown) => void, effect: Effect) => (() => void) | void) => Promise<T>
    /**
     * Calls `computation` with the value of `dependencies` and the one before, whenever it changed.
     * Unlike an effect it does not run right away, and does not depend on what `computation` reads.
     * The function that `computation` returns is called like the one of an effect. The watcher is an effect itself, and is passed to `computation` as the last argument.
     */
    watch: <T>(dependencies: ReadonlySignal<T> | MemoType<T> | (() => T), computation: (next: NoInfer<T>, prev: NoInfer<T>, effect: Effect) => (() => void) | void, options?: WatchOptions<NoInfer<T>>, meta?: Meta) => Effect
} = Object.assign(create, {
    defer,
    watch,
})

function create(computation: (effect: Effect) => (() => void) | void, meta?: Meta): Effect {
    const effect = new RawEffect(computation)
    effect.run()
    if (meta?.hmr && effect.fn) afterDispose(effect, hmr(() => effect.dispose(), meta)!)
    return effect
}

/** Gives `effect` a `dispose` of its own, which calls `then` afterwards. Only for what is rare: `Effect.defer`, and modules that can be replaced during development. */
function afterDispose(effect: RawEffect, then: () => void): void {
    effect.dispose = function () {
        RawEffect.prototype.dispose.call(this)
        then()
    }
}

function defer<T = void>(computation: (resolve: (value: T) => void, reject: (reason?: unknown) => void, effect: Effect) => (() => void) | void): Promise<T> {
    let effect: RawEffect | undefined
    return new Promise<T>((resolve, reject) => {
        effect = new RawEffect(effect => computation(resolve, reject, effect))
        // Disposed for another reason than being done: nothing is going to resolve it anymore. Rejecting a settled promise does nothing.
        afterDispose(effect, reject)
        effect.run()
    }).finally(() => effect?.dispose())
}

function watch<T>(dependencies: ReadonlySignal<T> | MemoType<T> | (() => T), computation: (next: T, prev: T, effect: Effect) => (() => void) | void, options?: WatchOptions<T>, meta?: Meta): Effect {
    // A function is turned into a memo, to only run when it returns something else.
    const read = "kind" in dependencies ? dependencies : Memo(dependencies, options)
    let init = false
    let value: T

    return create((effect) => {
        const prev = value
        value = read()
        if (!init) return void (init = true)
        // Only what it reads of `dependencies` is depended on.
        pauseTracking()
        try { return computation(value, prev, effect) }
        finally { resumeTracking() }
    }, meta)
}
