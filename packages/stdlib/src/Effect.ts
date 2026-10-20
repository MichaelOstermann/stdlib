import type { Meta } from "./internals/hmr"
import type { ReadonlySignal } from "./Signal"
import { hmr } from "./internals/hmr"
import { pauseTracking, resumeTracking } from "./internals/reactivity"
import { RawEffect } from "./internals/system"
import { Memo } from "./Memo"

/** `this` inside of the computation of an effect, which is a `function` for that, not an arrow function. */
export interface EffectContext {
    /** Stops the effect from the inside, also during its first run, when what `Effect` returns is not assigned yet. */
    dispose: () => void
}

export interface WatchOptions<T> {
    /** Whether two values are the same, for `computation` to not be called. Only asked when they are not `===`, and only for a function: a signal or a memo has its own. */
    equals?: (before: T, after: T) => boolean
}

/**
 * `Effect(computation)`
 *
 * Calls `computation` right away, and again whenever a signal or memo changes that it read. Use it to apply changes outside of signals: the DOM, a request, a log.
 * Returns what stops it, which also calls the cleanup of its last run, and does nothing the second time.
 *
 * - it runs right away, and again once the batch is done in which something changed
 * - the function that `computation` returns is called before the next run and when the effect is stopped
 * - `this.dispose()` stops it from the inside, also during the first run: `computation` is a `function` for that, not an arrow function
 * - what `computation` throws is thrown by what created the effect, or by what changed the signal
 * - during development it is stopped when its module is replaced, the plugin passes the metadata for that as the last argument
 *
 * ```ts
 * const $count = Signal(0);
 *
 * const stop = Effect(() => {
 *     console.log($count());
 *     return () => console.log("cleanup");
 * }); // 0
 *
 * $count(1); // "cleanup", 1
 * stop(); // "cleanup"
 *
 * Effect(function () {
 *     if ($done()) return this.dispose();
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
    (computation: (this: EffectContext) => (() => void) | void, meta?: Meta): () => void
    /** Runs an effect until it calls `resolve` or `reject`, and returns a promise of that. It is stopped afterwards, and stopping it before rejects. */
    defer: <T = void>(computation: (this: EffectContext, resolve: (value: T) => void, reject: (reason?: unknown) => void) => (() => void) | void) => Promise<T>
    /**
     * Calls `computation` with the value of `dependencies` and the one before, whenever it changed.
     * Unlike an effect it does not run right away, and does not depend on what `computation` reads.
     * The function that `computation` returns is called like the one of an effect. What stops the watcher is returned, and `this.dispose()` stops it from the inside, like an effect.
     */
    watch: <T>(dependencies: ReadonlySignal<T> | Memo<T> | (() => T), computation: (this: EffectContext, next: NoInfer<T>, prev: NoInfer<T>) => (() => void) | void, options?: WatchOptions<NoInfer<T>>, meta?: Meta) => () => void
} = Object.assign(create, {
    defer,
    watch,
})

function create(computation: (this: EffectContext) => (() => void) | void, meta?: Meta): () => void {
    const effect = new RawEffect(computation)
    effect.run()
    const stop = (): void => effect.dispose()
    if (meta?.hmr && effect.fn) afterDispose(effect, hmr(stop, meta)!)
    return stop
}

/** Gives `effect` a `dispose` of its own, which calls `then` afterwards. Only for what is rare: `Effect.defer`, and modules that can be replaced during development. */
function afterDispose(effect: RawEffect, then: () => void): void {
    effect.dispose = function () {
        RawEffect.prototype.dispose.call(this)
        then()
    }
}

function defer<T = void>(computation: (this: EffectContext, resolve: (value: T) => void, reject: (reason?: unknown) => void) => (() => void) | void): Promise<T> {
    let effect: RawEffect | undefined
    return new Promise<T>((resolve, reject) => {
        effect = new RawEffect(function () {
            return computation.call(this, resolve, reject)
        })
        // Disposed for another reason than being done: nothing is going to resolve it anymore. Rejecting a settled promise does nothing.
        afterDispose(effect, reject)
        effect.run()
    }).finally(() => effect?.dispose())
}

function watch<T>(dependencies: ReadonlySignal<T> | Memo<T> | (() => T), computation: (this: EffectContext, next: T, prev: T) => (() => void) | void, options?: WatchOptions<T>, meta?: Meta): () => void {
    // A function is turned into a memo, to only run when it returns something else.
    const read = "kind" in dependencies ? dependencies : Memo(dependencies, options)
    let init = false
    let value: T

    return create(function () {
        const prev = value
        value = read()
        if (!init) return void (init = true)
        // Only what it reads of `dependencies` is depended on.
        pauseTracking()
        try { return computation.call(this, value, prev) }
        finally { resumeTracking() }
    }, meta)
}
