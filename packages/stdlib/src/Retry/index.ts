import { again } from "./again"
import { run } from "./run"

export type { RetryAgain } from "../internals/retry"

export interface RetryOptions {
    /** How much longer than asked for a wait can randomly become, as a part of it. `0.2` by default, see `Duration.jitter`. */
    jitter?: number
    /** How often `fn` is called at most. Without it, it is called until it stops asking to be called again. */
    maxAttempts?: number
    /** The longest wait between two attempts, 5 minutes by default. */
    maxDelay?: number
    /** The wait after the first attempt, a second by default. It doubles with every attempt, see `Duration.backoff`. */
    minDelay?: number
    /** Stops trying again once aborted, also in the middle of a wait. An attempt that is running is not interrupted. */
    signal?: AbortSignal
    /** Waits between two attempts, in place of a timer. */
    sleep?: (delay: number, attempt: number) => Promise<void>
}

export const Retry = {
    again,
    run,
}
