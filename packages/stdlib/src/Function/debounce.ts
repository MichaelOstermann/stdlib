import type { Timer } from "./internals/timers"
import { clearTimer, createTimer, restartTimer, startTimer } from "./internals/timers"

export interface Debounced<T extends unknown[]> {
    (...args: T): void
    clear: () => void
    flush: () => void
    idle: (gracePeriod?: number) => Promise<void>
    isIdle: () => boolean
    isPending: () => boolean
    isRunning: () => boolean
}

type DebounceOptions = {
    leading?: boolean
    maxWait?: number
    trailing?: boolean
    wait: number
}

/**
 * # debounce
 *
 * ```ts
 * function Function.debounce(...args: T): void
 * ```
 *
 * Creates a debounced function that delays invoking `fn` until after `options.wait` milliseconds have elapsed since the last time the debounced function was invoked.
 *
 * Implementation details:
 *
 * - Only one `fn` can run at any given time, asynchronous functions can not conflict with each other
 * - Pending calls are not accumulated in an internal array and asynchronously resolved
 *
 * ## Example
 *
 * ```ts
 * const save = Function.debounce(write, { wait: 1000 }); // Calls write a second after the last call of save.
 *
 * const debouncedSave = Function.debounce(saveData, {
 *     wait: 1000,
 *     // Maximum time to wait after the first call, default: undefined
 *     maxWait?: 5000,
 *     // Invoke function on the leading edge, default: false
 *     leading?: false,
 *     // Invoke function on the trailing edge, default: true
 *     trailing?: true,
 * });
 *
 * // void
 * debouncedSave(data);
 *
 * // Cancel pending execution - does not cancel current invocation
 * debouncedSave.clear();
 *
 * // Execute pending invocation asap
 * debouncedSave.flush();
 *
 * debouncedSave.isIdle();
 * debouncedSave.isPending();
 * debouncedSave.isRunning();
 *
 * // Wait until idle, if a `gracePeriod` is given then wait
 * // until it has been idle for `gracePeriod` milliseconds
 * await debouncedSave.idle(gracePeriod?: number);
 * ```
 *
 */
export function debounce<T extends unknown[]>(
    fn: (...args: T) => void | Promise<void>,
    options: DebounceOptions,
): Debounced<T> {
    let isRunning = false
    let isPending = false
    let flushAsap = false
    let leadAsap = false
    let nextArgs: T | undefined
    const idleTimers = new Set<Timer>()
    const waitTimer = createTimer(options.wait, options.trailing === false ? expire : invoke)
    const maxWaitTimer = createTimer(options.maxWait ?? -1, options.trailing === false ? clear : invoke)

    function clear() {
        if (!isPending) return

        isPending = false
        flushAsap = false
        leadAsap = false
        nextArgs = undefined
        clearTimer(waitTimer)
        clearTimer(maxWaitTimer)

        if (!isRunning) restartTimer(idleTimers)
    }

    function expire() {
        // A call that would have been a leading call is kept until the running call is done.
        if (!leadAsap) clear()
    }

    async function invoke() {
        const args = nextArgs
        if (isRunning || !isPending || !args) return

        isRunning = true
        isPending = false
        leadAsap = false
        nextArgs = undefined
        // With leading the wait timer tells when the next leading call is due, that does not change with a call in between.
        if (!options.leading) clearTimer(waitTimer)
        clearTimer(maxWaitTimer)
        clearTimer(idleTimers)

        try {
            await fn(...args)
        }
        finally {
            isRunning = false

            // A flush only concerns the call that was pending when it was asked for.
            const flush = flushAsap
            flushAsap = false

            if (isPending && (flush || leadAsap)) {
                invoke()
            }
            else if (isPending) {
                restartTimer(waitTimer)
                restartTimer(maxWaitTimer)
            }
            else {
                restartTimer(idleTimers)
            }
        }
    }

    function debounced(...args: T): void {
        // The wait timer keeps running after a leading call, to tell when the next one is due.
        const isLeading = options.leading && !isPending && waitTimer.tid == null

        isPending = true
        nextArgs = args

        if (isRunning) {
            if (isLeading) {
                leadAsap = true
                restartTimer(waitTimer)
            }
            return
        }

        if (isLeading) {
            invoke()
            restartTimer(waitTimer)
            return
        }

        clearTimer(idleTimers)
        restartTimer(waitTimer)
        startTimer(maxWaitTimer)
    }

    debounced.clear = clear

    debounced.flush = function () {
        if (!isPending) return
        if (!isRunning) invoke()
        else flushAsap = true
    }

    debounced.idle = function (gracePeriod: number = 0): Promise<void> {
        return new Promise<void>((resolve) => {
            const t = createTimer(gracePeriod, () => {
                idleTimers.delete(t)
                resolve()
            })
            idleTimers.add(t)
            if (!isPending && !isRunning) startTimer(t)
        })
    }

    debounced.isIdle = () => !isPending && !isRunning
    debounced.isPending = () => isPending
    debounced.isRunning = () => isRunning

    return debounced
}
