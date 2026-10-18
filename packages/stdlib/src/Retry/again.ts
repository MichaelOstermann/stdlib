import { RetryAgain } from "../internals/retry"
import { Err } from "../Result"

/**
 * # again
 *
 * ```ts
 * function Retry.again<E>(error: E, delay?: number): Err<RetryAgain<E>>
 * ```
 *
 * A failure that `Retry.run` tries again for. `error` is the error the result fails with once `Retry.run` stops retrying, `delay` overrides the milliseconds it waits before the next attempt.
 *
 * ## Example
 *
 * ```ts
 * Retry.run(async () => {
 *     const response = await fetch(url);
 *     if (response.status === 503) return Retry.again("unavailable" as const);
 *     if (response.status === 429) return Retry.again("busy" as const, 30 * Duration.SECOND);
 *     return Ok(response);
 * });
 * ```
 *
 */
export function again(): Err<RetryAgain<void>>
export function again<E extends string>(error: E, delay?: number): Err<RetryAgain<E>>
export function again<E>(error: E, delay?: number): Err<RetryAgain<E>>
export function again<E>(error?: E, delay?: number): Err<RetryAgain<E | void>> {
    return Err(new RetryAgain(error, delay))
}
