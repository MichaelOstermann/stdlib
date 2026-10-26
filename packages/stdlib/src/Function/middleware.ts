export interface Middleware<T extends unknown[], U> {
    (next: (...args: T) => U, ...args: T): U
}

export interface WithMiddleware<T extends unknown[], U> {
    (...args: T): U
    /**
     * Adds a middleware around the ones that are there already, and returns a function that removes
     * it again.
     */
    use: (middleware: Middleware<T, U>) => () => void
}

/**
 * # middleware
 *
 * ```ts
 * function Function.middleware<T extends unknown[], U>(
 *     fn: (...args: T) => U,
 * ): WithMiddleware<T, U>
 * ```
 *
 * Returns a function that calls `fn`, and that others can get in between of: a middleware is called
 * with `next` and the arguments, and decides what to pass on and what to return.
 *
 * The first middleware that was added is the first one to be called, `fn` is the last.
 *
 * ## Example
 *
 * ```ts
 * const send = Function.middleware(write); // Calls write, with send.use() to get in between.
 *
 * const log = Function.middleware((message: string) => console.log(message));
 *
 * const remove = log.use((next, message) => next(message.toUpperCase()));
 * log.use((next, message) => next(`${message}!`));
 *
 * log("hello"); // "HELLO!"
 *
 * remove();
 * log("hello"); // "hello!"
 * ```
 */
export function middleware<T extends unknown[], U>(fn: (...args: T) => U): WithMiddleware<T, U> {
    // Wrapped, for the same function to be something that can be added twice.
    const entries: { middleware: Middleware<T, U> }[] = []
    let dispatch = fn

    const rebuild = (): void => {
        dispatch = entries.reduceRight<(...args: T) => U>(
            (next, entry) => (...args) => entry.middleware(next, ...args),
            fn,
        )
    }

    const result = ((...args: T) => dispatch(...args)) as WithMiddleware<T, U>

    result.use = (middleware) => {
        const entry = { middleware }
        entries.push(entry)
        rebuild()

        return () => {
            const index = entries.indexOf(entry)
            if (index === -1) return
            entries.splice(index, 1)
            rebuild()
        }
    }

    return result
}
