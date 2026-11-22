export interface Middleware<T extends unknown[], U> {
    (next: (...args: T) => U, ...args: T): U
}

export interface WithMiddleware<T extends unknown[], U> {
    (...args: T): U
    /**
     * Adds a middleware around the existing ones. Returns a function that removes the middleware
     * again.
     */
    use: (middleware: Middleware<T, U>) => () => void
}

/**
 * # middleware
 *
 * Returns a function that calls `fn`, with room for middleware in between. A middleware gets `next`
 * and the arguments, and decides what to pass on and what to return.
 *
 * The first added middleware is called first. `fn` is called last.
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
