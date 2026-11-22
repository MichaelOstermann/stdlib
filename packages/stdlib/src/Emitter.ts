import { endBatch, pauseTracking, resumeTracking, startBatch } from "./internals/reactivity"

type AnyFn = (...args: any[]) => any

export interface Listener<T> {
    (message: T): void
}

export interface AsyncListener<T> {
    (message: T): Promise<void> | void
}

/** How an `Emitter` calls its listeners. */
export interface Dispatch<T> {
    (listeners: Set<Listener<T>>, message: T): void
}

/** How an `AsyncEmitter` calls its listeners. */
export interface AsyncDispatch<T> {
    (listeners: Set<AsyncListener<T>>, message: T): Promise<void>
}

/** An emitter that can only be listened to. */
export interface ReadonlyEmitter<T = void> {
    /** Adds a listener. Returns a function that removes the listener again. */
    (listener: Listener<T>): () => void
}

/** An emitter that waits for its listeners, and can only be listened to. */
export interface ReadonlyAsyncEmitter<T = void> {
    /** Adds a listener. Returns a function that removes the listener again. */
    (listener: AsyncListener<T>): () => void
}

/**
 * A single event. Call it with a function to listen. Call it with anything else to send a message
 * to the listeners.
 */
export interface Emitter<T = void> extends ReadonlyEmitter<T> {
    /**
     * Calls every listener with `message`, in the order they were added. Then throws what the
     * listeners threw.
     */
    (message: T): void
    readonly listeners: Set<Listener<T>>
}

/**
 * A single event that waits for its listeners. Call it with a function to listen. Call it with
 * anything else to send a message to the listeners.
 */
export interface AsyncEmitter<T = void> extends ReadonlyAsyncEmitter<T> {
    /**
     * Calls every listener with `message`, one after the other. Resolves once the last listener is
     * done, or rejects with what the listeners threw.
     */
    (message: T): Promise<void>
    readonly listeners: Set<AsyncListener<T>>
}

/**
 * `Emitter<T>(dispatch?)`
 *
 * Creates a single event. The argument decides what a call does. A function is added as a
 * listener. Anything else is sent to the listeners as a message, so a function cannot be a message.
 *
 * - listeners are kept in a `Set`. The same function counts once. A listener added while a message
 *   is sent is called as well
 * - a listener that throws does not stop the others. After all listeners were called, sending
 *   throws the error, or an `AggregateError` when several listeners threw
 * - `dispatch` replaces how listeners are called. It gets the default dispatch as its third
 *   argument, to wrap it or to catch its errors
 * - sending is batched and untracked. Effects run after every listener has been called, and reads
 *   inside listeners are not tracked
 * - there is nothing to dispose. `listeners.clear()` removes the listeners. An emitter without
 *   references is garbage collected with its listeners
 *
 * ```ts
 * const onMessage = Emitter<string>();
 *
 * const remove = onMessage((message) => console.log(message));
 * onMessage("hello"); // "hello"
 * remove();
 *
 * onMessage.listeners.size; // 0
 * onMessage.listeners.clear();
 *
 * // Expose an emitter that can only be listened to.
 * const onChange: ReadonlyEmitter<string> = onMessage;
 *
 * // Report what listeners throw, instead of throwing it at the sender.
 * const onSave = Emitter<string>((listeners, message, dispatch) => {
 *     try { dispatch(listeners, message) }
 *     catch (error) { reportError(error) }
 * });
 * ```
 */
export function Emitter<T = void>(dispatch?: (listeners: Set<Listener<T>>, message: T, dispatch: Dispatch<T>) => void): [T] extends [AnyFn] ? never : Emitter<T> {
    const listeners = new Set<Listener<T>>()

    const emitter = (input: Listener<T> | T): unknown => {
        if (typeof input === "function") return listen(listeners, input as Listener<T>)
        if (!dispatch && !listeners.size) return undefined

        startBatch()
        pauseTracking()
        try {
            if (dispatch) dispatch(listeners, input, call)
            else call(listeners, input)
        }
        finally {
            resumeTracking()
            endBatch()
        }
        return undefined
    }

    emitter.listeners = listeners
    return emitter as never
}

/**
 * `AsyncEmitter<T>(dispatch?)`
 *
 * Creates a single event like `Emitter`, but the listeners can be async. Listeners are called one
 * after the other, each after the previous one is done. Sending a message returns a promise that
 * resolves when all listeners are done.
 *
 * A listener that throws does not stop the others. After all listeners were called, the promise
 * rejects with the error, or an `AggregateError` when several listeners threw. Unlike an `Emitter`,
 * an `AsyncEmitter` does not batch or untrack, because neither lasts across an `await`.
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
export function AsyncEmitter<T = void>(dispatch?: (listeners: Set<AsyncListener<T>>, message: T, dispatch: AsyncDispatch<T>) => Promise<void>): [T] extends [AnyFn] ? never : AsyncEmitter<T> {
    const listeners = new Set<AsyncListener<T>>()

    const emitter = (input: AsyncListener<T> | T): unknown => {
        if (typeof input === "function") return listen(listeners, input as AsyncListener<T>)
        return dispatch ? dispatch(listeners, input, send) : send(listeners, input)
    }

    emitter.listeners = listeners
    return emitter as never
}

function listen<T>(listeners: Set<T>, listener: T): () => void {
    listeners.add(listener)
    return () => void listeners.delete(listener)
}

/** How an `Emitter` calls its listeners by default. */
function call<T>(listeners: Set<Listener<T>>, message: T): void {
    let errors: unknown[] | undefined
    for (const listener of listeners) {
        try { listener(message) }
        catch (error) { (errors ??= []).push(error) }
    }
    if (errors) throw thrown("Emitter", errors)
}

/** How an `AsyncEmitter` calls its listeners by default. */
async function send<T>(listeners: Set<AsyncListener<T>>, message: T): Promise<void> {
    let errors: unknown[] | undefined
    for (const listener of listeners) {
        try { await listener(message) }
        catch (error) { (errors ??= []).push(error) }
    }
    if (errors) throw thrown("AsyncEmitter", errors)
}

/** Returns one error as is. Wraps several in an `AggregateError` named after the emitter. */
function thrown(title: string, errors: unknown[]): unknown {
    return errors.length === 1 ? errors[0] : new AggregateError(errors, title)
}
