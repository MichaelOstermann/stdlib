/**
 * # once
 *
 * ```ts
 * function Function.once<T>(fn: () => T): () => T
 * ```
 *
 * Returns a function that calls `fn` the first time it is called, and returns the result of that first call from then on.
 *
 * A call that throws does not count, the next one tries again.
 *
 * ## Example
 *
 * ```ts
 * const config = Function.once(readConfig); // Reads on the first call, returns the same from then on.
 *
 * const config = Function.once(() => JSON.parse(readFileSync("config.json", "utf8")));
 *
 * config(); // Reads the file.
 * config(); // The same object, without reading.
 * ```
 *
 */
export function once<T>(fn: () => T): () => T {
    let call: (() => T) | undefined = fn
    let result: T

    return () => {
        if (call) {
            result = call()
            // Nothing that `fn` holds on to is kept longer than needed.
            call = undefined
        }
        return result
    }
}
