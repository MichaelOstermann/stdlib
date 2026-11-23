/**
 * The failure of `Retry.again`: an error worth retrying, and optionally how long to wait before the
 * next attempt.
 */
export class RetryAgain<E> {
    constructor(
        readonly error: E,
        readonly delay: number | undefined,
    ) {}
}
