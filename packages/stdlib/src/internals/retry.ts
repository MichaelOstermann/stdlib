/**
 * What `Retry.again` fails with: an error that is worth trying again for, and optionally how long
 * to wait before doing so.
 */
export class RetryAgain<E> {
    constructor(
        readonly error: E,
        readonly delay: number | undefined,
    ) {}
}
