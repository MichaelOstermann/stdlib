import type { ReadonlySignal } from "./Signal"
import { pauseTracking, resumeTracking } from "./internals/reactivity"
import { RawEffect } from "./internals/system"
import { Memo } from "./Memo"

/**
 * `this` inside the computation of an effect. The computation must be a `function`, not an arrow
 * function.
 */
export interface EffectContext {
    /**
     * Stops the effect from the inside. Works during the first run too, before the return value of
     * `Effect` is assigned.
     */
    dispose: () => void
}

export interface WatchOptions<T> {
    /**
     * Whether two values count as the same, so `computation` is not called. Only asked when the
     * values are not `===`, and only for a function. A signal or a memo has its own `equals`.
     */
    equals?: (before: T, after: T) => boolean
}

/**
 * `Effect(computation)`
 *
 * Calls `computation` right away, and again whenever a signal or memo that it read changes. Use it
 * to apply changes outside of signals: the DOM, a request, a log. Returns a function that stops the
 * effect. Stopping also calls the cleanup of the last run. A second stop does nothing.
 *
 * - the effect runs right away, and again after each batch that changed something it read
 * - the function that `computation` returns is called before the next run and when the effect stops
 * - `this.dispose()` stops the effect from the inside, even during the first run. For this,
 *   `computation` must be a `function`, not an arrow function
 * - an error in `computation` is thrown by the code that created the effect, or by the code that
 *   changed the signal
 * - a module that is replaced during development creates the effect again.
 *   `if (import.meta.hot) import.meta.hot.dispose(stop)` stops the old effect. Do not write
 *   `import.meta.hot?.dispose(Effect(…))`: a build removes that call, so the effect is never
 *   created
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
    (computation: (this: EffectContext) => (() => void) | void): () => void
    /**
     * Runs an effect until it calls `resolve` or `reject`. Returns a promise of that outcome. The
     * effect stops afterwards. Stopping the effect earlier rejects the promise.
     */
    defer: <T = void>(computation: (this: EffectContext, resolve: (value: T) => void, reject: (reason?: unknown) => void) => (() => void) | void) => Promise<T>
    /**
     * Calls `computation` with the new and the previous value of `dependencies` whenever the value
     * changes. Unlike an effect, a watcher does not run right away, and does not depend on what
     * `computation` reads. The cleanup that `computation` returns works like the cleanup of an
     * effect. Returns a function that stops the watcher. `this.dispose()` also stops it from the
     * inside.
     */
    watch: <T>(dependencies: ReadonlySignal<T> | (() => T), computation: (this: EffectContext, next: NoInfer<T>, prev: NoInfer<T>) => (() => void) | void, options?: WatchOptions<NoInfer<T>>) => () => void
} = Object.assign(create, {
    defer,
    watch,
})

function create(computation: (this: EffectContext) => (() => void) | void): () => void {
    const effect = new RawEffect(computation)
    effect.run()
    return () => effect.dispose()
}

/**
 * Gives `effect` its own `dispose`, which calls `then` afterwards. Only for rare cases such as
 * `Effect.defer`.
 */
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

function watch<T>(dependencies: ReadonlySignal<T> | (() => T), computation: (this: EffectContext, next: T, prev: T) => (() => void) | void, options?: WatchOptions<T>): () => void {
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
    })
}
