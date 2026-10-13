/* eslint-disable @typescript-eslint/no-redeclare -- Emitter and AsyncEmitter are a type and what creates it */
import type { Disposer } from "./Disposer"
import type { Meta } from "./internals/hmr"
import { Disposer as createDisposer } from "./Disposer"
import { noop } from "./Function/noop"
import { holdDisposer } from "./internals/disposers"
import { hmr } from "./internals/hmr"
import { endBatch, pauseTracking, resumeTracking, startBatch } from "./internals/reactivity"

type AnyFn = (...args: any[]) => any

export interface Listener<T> {
    (message: T): void
}

export interface AsyncListener<T> {
    (message: T): Promise<void> | void
}

/** An emitter that can only be listened to. */
export interface ReadonlyEmitter<T = void> {
    /** Adds a listener, and returns a function that removes it again. */
    (listener: Listener<T>): () => void
}

/** An emitter that waits for its listeners, and can only be listened to. */
export interface ReadonlyAsyncEmitter<T = void> {
    /** Adds a listener, and returns a function that removes it again. */
    (listener: AsyncListener<T>): () => void
}

/** A single event: call it with a function to listen, and with anything else to tell the listeners about it. */
export interface Emitter<T = void> extends ReadonlyEmitter<T>, Disposer {
    /** Calls every listener with `message`, in the order they were added. */
    (message: T): void
    readonly listeners: Set<Listener<T>>
    /** Removes all listeners, without disposing. */
    clear: () => void
}

/** A single event that waits for its listeners: call it with a function to listen, and with anything else to tell the listeners about it. */
export interface AsyncEmitter<T = void> extends ReadonlyAsyncEmitter<T>, Disposer {
    /** Calls every listener with `message`, one after the other, and resolves once the last one is done. */
    (message: T): Promise<void>
    readonly listeners: Set<AsyncListener<T>>
    /** Removes all listeners, without disposing. */
    clear: () => void
}

/**
 * `Emitter<T>(dispatch?)`
 *
 * Creates a single event. The argument decides what a call does: a function is added as a listener, anything else is sent to the listeners as a message.
 * A function can therefore not be a message.
 *
 * - listeners are kept in a `Set`: the same function counts once, and one that is added while a message is sent is called as well
 * - `dispatch` replaces how listeners are called, to wrap it or to catch what they throw
 * - sending is batched and untracked: effects run once every listener has been called, and what listeners read is not depended on
 * - it can be disposed like a `Disposer`, which removes its listeners and ignores new ones
 * - during development it is disposed when its module is replaced, the plugin passes the metadata for that as the last argument
 *
 * ```ts
 * const onMessage = Emitter<string>();
 *
 * const remove = onMessage((message) => console.log(message));
 * onMessage("hello"); // "hello"
 * remove();
 *
 * onMessage.listeners.size; // 0
 * onMessage.clear();
 *
 * onMessage.onDispose(() => socket.close());
 * onMessage.dispose();
 * onMessage.disposed; // true
 *
 * // Expose an emitter that can only be listened to.
 * const onChange: ReadonlyEmitter<string> = onMessage;
 * ```
 */
export function Emitter<T = void>(dispatch?: (listeners: Set<Listener<T>>, message: T) => void, meta?: Meta): [T] extends [AnyFn] ? never : Emitter<T> {
    const listeners = new Set<Listener<T>>()

    const emitter = (input: Listener<T> | T): unknown => {
        if (typeof input === "function") return listen(emitter, input as Listener<T>)
        if (!dispatch && !listeners.size) return undefined

        startBatch()
        pauseTracking()
        try {
            if (dispatch) {
                dispatch(listeners, input)
            }
            else {
                for (const listener of listeners) listener(input)
            }
        }
        finally {
            resumeTracking()
            endBatch()
        }
        return undefined
    }

    emitter.listeners = listeners
    return disposable(emitter, meta) as never
}

/**
 * `AsyncEmitter<T>(dispatch?)`
 *
 * Creates a single event like `Emitter`, whose listeners can take their time: they are called one after the other, each one once the one before is done, and sending a message returns a promise of all of them being done.
 *
 * It rejects with what a listener throws, the ones after it are not called.
 * Unlike an `Emitter` it does not batch or untrack, neither lasts across an `await`.
 *
 * ```ts
 * const onShutdown = AsyncEmitter<string>();
 *
 * onShutdown(async (reason) => await database.close());
 * onShutdown(async (reason) => await server.stop());
 *
 * await onShutdown("SIGTERM");
 * ```
 */
export function AsyncEmitter<T = void>(dispatch: (listeners: Set<AsyncListener<T>>, message: T) => Promise<void> = send, meta?: Meta): [T] extends [AnyFn] ? never : AsyncEmitter<T> {
    const listeners = new Set<AsyncListener<T>>()

    const emitter = (input: AsyncListener<T> | T): unknown => {
        if (typeof input === "function") return listen(emitter, input as AsyncListener<T>)
        return dispatch(listeners, input)
    }

    emitter.listeners = listeners
    return disposable(emitter, meta) as never
}

interface Target<T> {
    disposed?: boolean
    listeners: Set<T>
}

function listen<T>(emitter: Target<T>, listener: T): () => void {
    if (emitter.disposed) return noop
    const listeners = emitter.listeners
    listeners.add(listener)
    return () => void listeners.delete(listener)
}

/** How an `AsyncEmitter` calls its listeners, unless it is told otherwise. */
async function send<T>(listeners: Set<AsyncListener<T>>, message: T): Promise<void> {
    for (const listener of listeners) await listener(message)
}

/** Makes an emitter something to dispose. The disposer behind it is only created once something asks for it. */
function disposable<T, U extends Target<T>>(emitter: U, meta: Meta | undefined): Disposer & U & { clear: () => void } {
    const target = emitter as Disposer & U & { disposed: boolean, clear: () => void }
    const listeners = emitter.listeners
    let disposer: Disposer | undefined

    const end = (): void => {
        target.disposed = true
        listeners.clear()
    }

    const own = (): Disposer => {
        if (disposer) return disposer
        disposer = createDisposer()
        // Added first, so it runs last: after everything else that has been added to the emitter's disposer.
        if (target.disposed) disposer.dispose()
        else disposer.onDispose(end)
        return disposer
    }

    target.clear = () => listeners.clear()
    target.disposed = false
    target.dispose = () => disposer ? disposer.dispose() : end()
    target.onDispose = value => own().onDispose(value)
    target[Symbol.dispose] = target.dispose
    holdDisposer(target, own)
    hmr(target, meta)
    return target
}
