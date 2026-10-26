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
    /** Adds a listener, and returns a function that removes it again. */
    (listener: Listener<T>): () => void
}

/** An emitter that waits for its listeners, and can only be listened to. */
export interface ReadonlyAsyncEmitter<T = void> {
    /** Adds a listener, and returns a function that removes it again. */
    (listener: AsyncListener<T>): () => void
}

/**
 * A single event: call it with a function to listen, and with anything else to tell the listeners
 * about it.
 */
export interface Emitter<T = void> extends ReadonlyEmitter<T> {
    /**
     * Calls every listener with `message`, in the order they were added, and then throws what they
     * threw.
     */
    (message: T): void
    readonly listeners: Set<Listener<T>>
}

/**
 * A single event that waits for its listeners: call it with a function to listen, and with anything
 * else to tell the listeners about it.
 */
export interface AsyncEmitter<T = void> extends ReadonlyAsyncEmitter<T> {
    /**
     * Calls every listener with `message`, one after the other, and resolves once the last one is
     * done, or rejects with what they threw.
     */
    (message: T): Promise<void>
    readonly listeners: Set<AsyncListener<T>>
}

/**
 * `Emitter<T>(dispatch?)`
 *
 * Creates a single event. The argument decides what a call does: a function is added as a listener,
 * anything else is sent to the listeners as a message. A function can therefore not be a message.
 *
 * - listeners are kept in a `Set`: the same function counts once, and one that is added while a
 *   message is sent is called as well
 * - a listener that throws does not stop the others: once all were called, sending throws what one
 *   threw, an `AggregateError` of them when several did
 * - `dispatch` replaces how listeners are called, and gets the default as its third argument, to
 *   wrap it or to catch what it throws
 * - sending is batched and untracked: effects run once every listener has been called, and what
 *   listeners read is not depended on
 * - nothing to dispose: `listeners.clear()` removes the listeners, an emitter that is no longer
 *   referenced is garbage collected with them
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
 * Creates a single event like `Emitter`, whose listeners can take their time: they are called one
 * after the other, each one once the one before is done, and sending a message returns a promise of
 * all of them being done.
 *
 * A listener that throws does not stop the others: once all were called, it rejects with what one
 * threw, an `AggregateError` of them when several did. Unlike an `Emitter` it does not batch or
 * untrack, neither lasts across an `await`.
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

/** How an `Emitter` calls its listeners, unless it is told otherwise. */
function call<T>(listeners: Set<Listener<T>>, message: T): void {
    let errors: unknown[] | undefined
    for (const listener of listeners) {
        try { listener(message) }
        catch (error) { (errors ??= []).push(error) }
    }
    if (errors) throw thrown("Emitter", errors)
}

/** How an `AsyncEmitter` calls its listeners, unless it is told otherwise. */
async function send<T>(listeners: Set<AsyncListener<T>>, message: T): Promise<void> {
    let errors: unknown[] | undefined
    for (const listener of listeners) {
        try { await listener(message) }
        catch (error) { (errors ??= []).push(error) }
    }
    if (errors) throw thrown("AsyncEmitter", errors)
}

/** One error as it is, several as an `AggregateError` whose message is the name of the emitter. */
function thrown(title: string, errors: unknown[]): unknown {
    return errors.length === 1 ? errors[0] : new AggregateError(errors, title)
}
