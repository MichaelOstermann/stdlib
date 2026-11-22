/**
 * # once
 *
 * Returns a function that calls `fn` on the first call. Later calls return the result of the first
 * call.
 *
 * A call that throws does not count. The next call tries again.
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
