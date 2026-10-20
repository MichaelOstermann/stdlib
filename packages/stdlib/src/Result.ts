/** Success or failure as a value: either an `Ok` with a value, or an `Err` with an error. `result.ok` tells which. */
export type Result<T, E> = Ok<T, E> | Err<E, T>
/** A successful result that holds `value`. */
export interface Ok<T, E = never> extends IResult<T, E> {
    /** Whether this succeeded, `value` is the error otherwise. */
    readonly ok: true
    readonly value: T
    match: <A, B = A>(handlers: { Err: (error: E) => B, Ok: (value: T) => A }) => A
    unwrap: () => T
    unwrapOr: <U>(fallback: U) => T
    unwrapOrElse: <U>(fn: (error: E) => U) => T
}
/** A result that failed, `value` is the error. */
export interface Err<E, T = never> extends IResult<T, E> {
    /** Whether this succeeded, `value` is the error otherwise. */
    readonly ok: false
    readonly value: E
    match: <A, B = A>(handlers: { Err: (error: E) => B, Ok: (value: T) => A }) => B
    unwrap: () => never
    unwrapOr: <U>(fallback: U) => U
    unwrapOrElse: <U>(fn: (error: E) => U) => U
}
/** What a result succeeds with. */
export type InferOk<R> = R extends Ok<infer T, unknown> ? T : never
/** What a result fails with. */
export type InferErr<R> = R extends Err<infer E, unknown> ? E : never

// Named differently than what creates it, the interfaces above are what an editor shows.
class OkResult<T, E = never> implements Ok<T, E> {
    readonly ok = true

    constructor(readonly value: T) {}

    andThen<R extends Result<unknown, unknown>>(fn: (value: T) => R): Result<InferOk<R>, E | InferErr<R>> {
        return fn(this.value) as Result<InferOk<R>, InferErr<R>>
    }

    inspect(fn: (value: T) => void): Result<T, E> {
        fn(this.value)
        return this
    }

    inspectErr(_fn: (error: E) => void): Result<T, E> {
        return this
    }

    map<U>(fn: (value: T) => U): Result<U, E> {
        return Ok(fn(this.value))
    }

    mapErr<F>(_fn: (error: E) => F): Result<T, F> {
        return this as unknown as Ok<T, F>
    }

    match<A, B = A>(handlers: { Err: (error: E) => B, Ok: (value: T) => A }): A {
        return handlers.Ok(this.value)
    }

    orElse<R extends Result<unknown, unknown>>(_fn: (error: E) => R): Result<T | InferOk<R>, InferErr<R>> {
        return this as Ok<T, InferErr<R>>
    }

    unwrap(): T {
        return this.value
    }

    unwrapOr<U>(_fallback: U): T {
        return this.value
    }

    unwrapOrElse<U>(_fn: (error: E) => U): T {
        return this.value
    }
}

class ErrResult<E, T = never> implements Err<E, T> {
    readonly ok = false

    constructor(readonly value: E) {}

    andThen<R extends Result<unknown, unknown>>(_fn: (value: T) => R): Result<InferOk<R>, E | InferErr<R>> {
        return this as Err<E, InferOk<R>>
    }

    inspect(_fn: (value: T) => void): Result<T, E> {
        return this
    }

    inspectErr(fn: (error: E) => void): Result<T, E> {
        fn(this.value)
        return this
    }

    map<U>(_fn: (value: T) => U): Result<U, E> {
        return this as unknown as Err<E, U>
    }

    mapErr<F>(fn: (error: E) => F): Result<T, F> {
        return Err(fn(this.value))
    }

    match<A, B = A>(handlers: { Err: (error: E) => B, Ok: (value: T) => A }): B {
        return handlers.Err(this.value)
    }

    orElse<R extends Result<unknown, unknown>>(fn: (error: E) => R): Result<T | InferOk<R>, InferErr<R>> {
        return fn(this.value) as Result<InferOk<R>, InferErr<R>>
    }

    unwrap(): never {
        throw this.value
    }

    unwrapOr<U>(fallback: U): U {
        return fallback
    }

    unwrapOrElse<U>(fn: (error: E) => U): U {
        return fn(this.value)
    }
}

export const Result = {
    all,
    try: tryI,
}

type AllOk<T extends readonly Result<unknown, unknown>[]> = { -readonly [K in keyof T]: InferOk<T[K]> }

/** Returns the values of `results` as an `Ok` when all of them succeeded, in the same order, or the first one that failed. */
function all<const T extends readonly Result<unknown, unknown>[]>(results: T): Result<AllOk<T>, InferErr<T[number]>> {
    const values: unknown[] = []
    for (const result of results) {
        if (!result.ok) return result as Err<InferErr<T[number]>>
        values.push(result.value)
    }
    return Ok(values as AllOk<T>)
}

/** Calls `fn` and returns what it returns as an `Ok`, or what it throws as an `Err`, passed through `onError` when given. */
function tryI<T, E>(fn: () => T, onError: (error: unknown) => E): Result<T, E>
function tryI<T, E = unknown>(fn: () => T): Result<T, E>
function tryI<T, E>(
    fn: () => T,
    onError?: (error: unknown) => E,
): Result<T, E> {
    try {
        return Ok(fn())
    }
    catch (error) {
        return Err(onError ? onError(error) : error as E)
    }
}

/** Creates a result that succeeded. */
export function Ok(): Ok<void>
export function Ok<T>(value: T): Ok<T>
export function Ok<T>(value?: T): Ok<T | void> {
    return new OkResult(value)
}

/** Creates a result that failed. */
export function Err(): Err<void>
export function Err<E extends string>(error: E): Err<E>
export function Err<E>(error: E): Err<E>
export function Err<E>(error?: E): Err<E | void> {
    return new ErrResult(error)
}

// Ok and Err must share these signatures so calls on a Result union resolve to a single Result type.
interface IResult<T, E> {
    /** Continues with another result when this one succeeded, a failure is passed along: `Ok(1).andThen(n => Ok(n + 1))` is `Ok(2)`. */
    andThen: <R extends Result<unknown, unknown>>(fn: (value: T) => R) => Result<InferOk<R>, E | InferErr<R>>
    /** Calls `fn` with the value when this succeeded, and returns the result unchanged. */
    inspect: (fn: (value: T) => void) => Result<T, E>
    /** Calls `fn` with the error when this failed, and returns the result unchanged. */
    inspectErr: (fn: (error: E) => void) => Result<T, E>
    /** Changes the value when this succeeded, a failure is passed along: `Ok(1).map(n => n + 1)` is `Ok(2)`. */
    map: <U>(fn: (value: T) => U) => Result<U, E>
    /** Changes the error when this failed, a success is passed along: `Err("a").mapErr(e => e + "b")` is `Err("ab")`. */
    mapErr: <F>(fn: (error: E) => F) => Result<T, F>
    /** Continues with another result when this one failed, a success is passed along: `Err("a").orElse(() => Ok(1))` is `Ok(1)`. */
    orElse: <R extends Result<unknown, unknown>>(fn: (error: E) => R) => Result<T | InferOk<R>, InferErr<R>>
    /** Returns the value when this succeeded, and throws the error when it failed. */
    unwrap: () => T
    /** Returns the value when this succeeded, and `fallback` when it failed. */
    unwrapOr: <U>(fallback: U) => T | U
    /** Returns the value when this succeeded, and what `fn` returns for the error when it failed. */
    unwrapOrElse: <U>(fn: (error: E) => U) => T | U
    /** Returns what `Ok` returns for the value, or what `Err` returns for the error. */
    match: <A, B = A>(handlers: {
        Err: (error: E) => B
        Ok: (value: T) => A
    }) => A | B
}
