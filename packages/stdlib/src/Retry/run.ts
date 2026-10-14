import type { RetryOptions } from "."
import type { Result } from "../Result"
import type { InferAsyncErr, InferAsyncOk } from "../ResultAsync"
import { backoff } from "../Duration/backoff"
import { jitter } from "../Duration/jitter"
import { RetryAgain } from "../internals/retry"
import { Err } from "../Result"
import { ResultAsync } from "../ResultAsync"

type RetryFn = (attempt: number) => PromiseLike<Result<unknown, unknown>> | Result<unknown, unknown>
type RetryErr<E> = E extends RetryAgain<infer U> ? U : E

/**
 * # run
 *
 * ```ts
 * function Retry.run(
 *     fn: (attempt: number) => Result<T, E> | PromiseLike<Result<T, E>>,
 *     options?: {
 *         maxAttempts?: number
 *         minDelay?: number
 *         maxDelay?: number
 *         jitter?: number
 *         signal?: AbortSignal
 *         sleep?: (delay: number, attempt: number) => Promise<void>
 *     },
 * ): ResultAsync<T, E>
 * ```
 *
 * Calls `fn` until it returns something other than `Retry.again`, waiting in between: a second at first, twice as long after every attempt, 5 minutes at most.
 *
 * Giving up needs no error of its own. After `maxAttempts`, or once `signal` is aborted, the result fails with the error that was last passed to `Retry.again`.
 *
 * ## Example
 *
 * ```ts
 * const result = await Retry.run(async (attempt) => {
 *     const response = await fetch(url);
 *     if (response.status === 503) return Retry.again("unavailable" as const);
 *     if (!response.ok) return Err("failed" as const);
 *     return Ok(await response.text());
 * }, { maxAttempts: 5, signal: controller.signal });
 *
 * // Result<string, "failed" | "unavailable">
 * ```
 *
 */
export function run<F extends RetryFn>(fn: F, options: RetryOptions = {}): ResultAsync<InferAsyncOk<ReturnType<F>>, RetryErr<InferAsyncErr<ReturnType<F>>>> {
    const { maxAttempts = Infinity, maxDelay = 300_000, minDelay = 1_000, signal } = options

    return ResultAsync.from(async () => {
        for (let attempt = 0; ; attempt++) {
            const result = await fn(attempt)
            if (result.ok || !(result.value instanceof RetryAgain)) return result
            if (attempt + 1 >= maxAttempts || signal?.aborted) return Err(result.value.error)

            const delay = jitter(result.value.delay ?? backoff(attempt, minDelay, maxDelay), options.jitter)
            const isAborted = await wait(options.sleep ? options.sleep(delay, attempt) : undefined, delay, signal)
            if (isAborted) return Err(result.value.error)
        }
    }) as ResultAsync<InferAsyncOk<ReturnType<F>>, RetryErr<InferAsyncErr<ReturnType<F>>>>
}

/** Waits for `sleep`, or for `delay` without it. Resolves early, with `true`, when `signal` is aborted in the meantime. */
function wait(sleep: Promise<void> | undefined, delay: number, signal: AbortSignal | undefined): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const timer = sleep ? undefined : setTimeout(done, delay, false)
        const onAbort = (): void => done(true)

        function done(isAborted: boolean): void {
            clearTimeout(timer)
            signal?.removeEventListener("abort", onAbort)
            resolve(isAborted)
        }

        signal?.addEventListener("abort", onAbort, { once: true })
        sleep?.then(() => done(false), reject)
    })
}
