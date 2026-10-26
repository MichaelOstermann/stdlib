/**
 * # sleep
 *
 * ```ts
 * function Promise.sleep(duration: number, signal?: AbortSignal): Promise<void>
 * ```
 *
 * Returns a promise that resolves after the milliseconds of `duration`. It rejects with the reason
 * of `signal` once that is aborted, right away when it is already.
 *
 * ## Example
 *
 * ```ts
 * await Promise.sleep(Duration.SECOND); // A second later.
 *
 * const controller = new AbortController();
 * await Promise.sleep(Duration.MINUTE, controller.signal);
 * ```
 */
export function sleep(duration: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(signal.reason)

        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort)
            resolve()
        }, duration)

        function onAbort(): void {
            clearTimeout(timer)
            reject(signal!.reason)
        }

        signal?.addEventListener("abort", onAbort, { once: true })
    })
}
