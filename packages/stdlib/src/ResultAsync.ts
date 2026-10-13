import type { Err as Failed, InferErr, InferOk, Result } from "./Result"
import { Err, Ok } from "./Result"

/** What a result, or a promise of one, succeeds with. */
export type InferAsyncOk<R> = InferOk<Awaited<R>>
/** What a result, or a promise of one, fails with. */
export type InferAsyncErr<R> = InferErr<Awaited<R>>

/** A `Result` that is not there yet. It can be awaited, and continued with the same methods without awaiting in between. */
export class ResultAsync<T, E> implements PromiseLike<Result<T, E>> {
    /** The promise of the result, it never rejects unless something that was passed in did unexpectedly. */
    readonly promise: Promise<Result<T, E>>

    constructor(promise: PromiseLike<Result<T, E>>) {
        this.promise = Promise.resolve(promise)
    }

    /** Waits for all of `results`, and returns their values as an `Ok` when all of them succeeded, in the same order, or the first one of them that failed. */
    static all<const T extends readonly (PromiseLike<Result<unknown, unknown>> | Result<unknown, unknown>)[]>(
        results: T,
    ): ResultAsync<{ -readonly [K in keyof T]: InferAsyncOk<T[K]> }, InferAsyncErr<T[number]>> {
        return new ResultAsync(Promise.all(results).then((results) => {
            const values: unknown[] = []
            for (const result of results) {
                if (!result.ok) return result as Failed<InferAsyncErr<T[number]>>
                values.push(result.value)
            }
            return Ok(values as { -readonly [K in keyof T]: InferAsyncOk<T[K]> })
        }))
    }

    /** Turns a function that returns a result, or a promise of one, into a `ResultAsync`. A rejection is not caught, see `ResultAsync.try`. */
    static from<R extends PromiseLike<Result<unknown, unknown>> | Result<unknown, unknown>>(
        fn: () => R,
    ): ResultAsync<InferAsyncOk<R>, InferAsyncErr<R>> {
        return new ResultAsync((async () => await fn() as Result<InferAsyncOk<R>, InferAsyncErr<R>>)())
    }

    /** Turns a promise into a `ResultAsync`: what it resolves to as an `Ok`, what it rejects with as an `Err`, passed through `onError` when given. */
    static promise<T, E>(promise: Promise<T>, onError: (error: unknown) => E): ResultAsync<Awaited<T>, E>
    static promise<T>(promise: Promise<T>): ResultAsync<Awaited<T>, unknown>
    static promise<T, E = unknown>(
        promise: Promise<T>,
        onError?: (error: unknown) => E,
    ): ResultAsync<Awaited<T>, E> {
        return ResultAsync.try(() => promise, onError as (error: unknown) => E)
    }

    /** Calls `fn` and awaits what it returns as an `Ok`, what it throws or rejects with as an `Err`, passed through `onError` when given. */
    static try<T, E>(fn: () => Promise<T> | T, onError: (error: unknown) => E): ResultAsync<Awaited<T>, E>
    static try<T>(fn: () => Promise<T> | T): ResultAsync<Awaited<T>, unknown>
    static try<T, E = unknown>(
        fn: () => Promise<T> | T,
        onError?: (error: unknown) => E,
    ): ResultAsync<Awaited<T>, E> {
        return new ResultAsync((async () => {
            try {
                return Ok(await fn())
            }
            catch (error) {
                return Err(onError ? onError(error) : error as E)
            }
        })())
    }

    /** Continues with another result when this one succeeded, a failure is passed along. */
    andThen<R extends PromiseLike<Result<unknown, unknown>> | Result<unknown, unknown>>(
        fn: (value: T) => R,
    ): ResultAsync<InferAsyncOk<R>, E | InferAsyncErr<R>> {
        return new ResultAsync(this.promise.then(async (result): Promise<Result<InferAsyncOk<R>, E | InferAsyncErr<R>>> => {
            if (!result.ok) return Err(result.value)
            return await fn(result.value) as Result<InferAsyncOk<R>, InferAsyncErr<R>>
        }))
    }

    /** Calls `fn` with the value when this succeeded and waits for it, the result stays unchanged. */
    inspect(fn: (value: T) => Promise<void> | void): ResultAsync<T, E> {
        return new ResultAsync(this.promise.then(async (result) => {
            if (result.ok) await fn(result.value)
            return result
        }))
    }

    /** Calls `fn` with the error when this failed and waits for it, the result stays unchanged. */
    inspectErr(fn: (error: E) => Promise<void> | void): ResultAsync<T, E> {
        return new ResultAsync(this.promise.then(async (result) => {
            if (!result.ok) await fn(result.value)
            return result
        }))
    }

    /** Changes the value when this succeeded, a failure is passed along. A promise that `fn` returns is awaited. */
    map<U>(fn: (value: T) => U): ResultAsync<Awaited<U>, E> {
        return new ResultAsync(this.promise.then(async (result): Promise<Result<Awaited<U>, E>> => {
            if (!result.ok) return Err(result.value)
            return Ok(await fn(result.value))
        }))
    }

    /** Changes the error when this failed, a success is passed along. A promise that `fn` returns is awaited. */
    mapErr<F>(fn: (error: E) => F): ResultAsync<T, Awaited<F>> {
        return new ResultAsync(this.promise.then(async (result): Promise<Result<T, Awaited<F>>> => {
            if (result.ok) return Ok(result.value)
            return Err(await fn(result.value))
        }))
    }

    /** Resolves to what `Ok` returns for the value, or what `Err` returns for the error. */
    match<A, B = A>(handlers: {
        Err: (error: E) => B
        Ok: (value: T) => A
    }): Promise<Awaited<A> | Awaited<B>> {
        return this.promise.then(async (result) => {
            if (result.ok) return await handlers.Ok(result.value)
            return await handlers.Err(result.value)
        }) as Promise<Awaited<A> | Awaited<B>>
    }

    /** Continues with another result when this one failed, a success is passed along. */
    orElse<R extends PromiseLike<Result<unknown, unknown>> | Result<unknown, unknown>>(
        fn: (error: E) => R,
    ): ResultAsync<T | InferAsyncOk<R>, InferAsyncErr<R>> {
        return new ResultAsync(this.promise.then(async (result): Promise<Result<T | InferAsyncOk<R>, InferAsyncErr<R>>> => {
            if (result.ok) return Ok(result.value)
            return await fn(result.value) as Result<InferAsyncOk<R>, InferAsyncErr<R>>
        }))
    }

    /** Makes this awaitable: `await result` is a `Result`. */
    then<TResult1 = Result<T, E>, TResult2 = never>(
        onfulfilled?: ((value: Result<T, E>) => PromiseLike<TResult1> | TResult1) | null,
        onrejected?: ((reason: unknown) => PromiseLike<TResult2> | TResult2) | null,
    ): PromiseLike<TResult1 | TResult2> {
        return this.promise.then(onfulfilled, onrejected)
    }

    /** Resolves to the value when this succeeded, and rejects with the error when it failed. */
    unwrap(): Promise<T> {
        return this.promise.then(result => result.unwrap())
    }

    /** Resolves to the value when this succeeded, and to `fallback` when it failed. */
    unwrapOr<U>(fallback: U): Promise<T | U> {
        return this.promise.then(result => result.unwrapOr(fallback))
    }

    /** Resolves to the value when this succeeded, and to what `fn` returns for the error when it failed. */
    unwrapOrElse<U>(fn: (error: E) => U): Promise<Awaited<U> | T> {
        return this.promise.then(result => result.unwrapOrElse(fn)) as Promise<Awaited<U> | T>
    }
}

/** Creates a result that succeeded, for where a `ResultAsync` is expected. */
export function OkAsync(): ResultAsync<void, never>
export function OkAsync<T>(value: T): ResultAsync<T, never>
export function OkAsync<T>(value?: T): ResultAsync<T | void, never> {
    return new ResultAsync<T | void, never>(Promise.resolve(Ok(value)))
}

/** Creates a result that failed, for where a `ResultAsync` is expected. */
export function ErrAsync(): ResultAsync<never, void>
export function ErrAsync<E extends string>(error: E): ResultAsync<never, E>
export function ErrAsync<E>(error: E): ResultAsync<never, E>
export function ErrAsync<E>(error?: E): ResultAsync<never, E | void> {
    return new ResultAsync<never, E | void>(Promise.resolve(Err(error)))
}
