import { again } from "./again"
import { run } from "./run"

export type { RetryAgain } from "../internals/retry"

export interface RetryOptions {
    /**
     * How much a wait can randomly grow, as a fraction of the wait. `0.2` by default, see
     * `Duration.jitter`.
     */
    jitter?: number
    /**
     * The maximum number of calls of `fn`. Without `maxAttempts`, `fn` is called until it stops
     * returning `Retry.again`.
     */
    maxAttempts?: number
    /** The longest wait between two attempts. 5 minutes by default. */
    maxDelay?: number
    /**
     * The wait after the first attempt. A second by default. The wait doubles with every attempt,
     * see `Duration.backoff`.
     */
    minDelay?: number
    /**
     * Stops retrying once aborted, even in the middle of a wait. A running attempt is not
     * interrupted.
     */
    signal?: AbortSignal
    /** Waits between two attempts. Replaces the timer. */
    sleep?: (delay: number, attempt: number) => Promise<void>
}

export const Retry = {
    again,
    run,
}
