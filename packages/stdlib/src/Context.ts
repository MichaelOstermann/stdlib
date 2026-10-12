/* eslint-disable @typescript-eslint/no-redeclare -- Context is a type and what creates it */

/** A value that is set for as long as a function runs: call it to read. */
export interface Context<T> {
    /** Returns the value of the innermost `run` that is going on, or the one the context was created with. */
    (): T
    /** Calls `fn` with `value` as the value of the context, and returns what it returns. The value before is back afterwards, also when `fn` throws. */
    run: <U>(value: T, fn: () => U) => U
}

/**
 * `Context<T>(value?)`
 *
 * Creates a value that is set for as long as a function runs, for what that function calls to read it without it being passed along.
 *
 * - `run` can be nested, the innermost one is what is read
 * - it only lasts while `fn` runs: what comes after an `await` reads the value from before again
 *
 * ```ts
 * const currentUser = Context<User>();
 *
 * currentUser(); // undefined
 * currentUser.run(user, () => {
 *     currentUser(); // user
 * });
 *
 * const depth = Context(0);
 * depth.run(depth() + 1, render);
 * ```
 */
export function Context<T>(): Context<T | undefined>
export function Context<T>(value: T): Context<T>
export function Context<T>(value?: T): Context<T | undefined> {
    let current = value

    const context = ((): T | undefined => current) as Context<T | undefined>

    context.run = (value, fn) => {
        const prev = current
        current = value
        try { return fn() }
        finally { current = prev }
    }

    return context
}
