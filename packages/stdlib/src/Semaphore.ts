import { Err, Ok } from "./Result"
import { ResultAsync } from "./ResultAsync"

/**
 * Runs a limited number of functions at the same time. The other functions wait for their turn, in
 * the order they came in.
 */
export interface Semaphore {
    /**
     * Calls `fn` when its turn comes, and resolves or rejects like `fn`. With a `key`, the limit
     * applies per key. Functions of different keys do not wait for each other.
     */
    run: (<T>(fn: () => PromiseLike<T> | T, options?: Semaphore.RunOptions) => Promise<Awaited<T>>) & (<T>(key: PropertyKey, fn: () => PromiseLike<T> | T, options?: Semaphore.RunOptions) => Promise<Awaited<T>>)
    /** How many functions are running or waiting. */
    readonly size: number
    /** Resolves once nothing is running or waiting. Resolves right away when nothing is. */
    idle: () => Promise<void>
}

export namespace Semaphore {
    /** The failure of a semaphore when `maxWaiting` functions already wait. */
    export type FullError = { message: string, name: "SemaphoreFullError" }

    /** The options of `run`, besides the function. */
    export interface RunOptions {
        /**
         * Removes a waiting function from the line. `run` then rejects with `signal.reason`. A
         * running function is not stopped. Pass the signal on to the function for that.
         */
        signal?: AbortSignal
    }

    /** A semaphore with a limited line. Functions beyond the limit fail. */
    export interface Bounded extends Omit<Semaphore, "run"> {
        /**
         * Calls `fn` when its turn comes, and succeeds with the result of `fn`. Fails right away
         * when too many functions already wait. With a `key`, the limits apply per key. Functions
         * of different keys do not wait for each other.
         */
        run: (<T>(fn: () => PromiseLike<T> | T, options?: RunOptions) => ResultAsync<Awaited<T>, FullError>) & (<T>(key: PropertyKey, fn: () => PromiseLike<T> | T, options?: RunOptions) => ResultAsync<Awaited<T>, FullError>)
    }
}

interface Slot {
    active: number
    /** The start functions of the waiting calls, in the order they came in. */
    waiting: (() => void)[]
}

type Fn = () => unknown

/**
 * `Semaphore(options)`
 *
 * Creates a semaphore that runs `concurrency` functions at the same time. The other functions wait
 * for their turn.
 *
 * - `run(fn)` is a pool, or a queue with a `concurrency` of `1`
 * - `run(key, fn)` is a lock: the limit applies to each key on its own
 * - with `maxWaiting`, `run` returns a `ResultAsync`. When the line is full, it fails with a
 *   `Semaphore.FullError`
 * - with a `signal`, aborting removes a waiting function from the line. `run` then rejects with
 *   `signal.reason`, like `fetch` does
 *
 * ```ts
 * const hashing = Semaphore({ concurrency: 2, maxWaiting: 100 });
 * const hash = await hashing.run(() => Bun.password.hash(password));
 * // Result<string, Semaphore.FullError>
 *
 * const migrations = Semaphore({ concurrency: 1 });
 * await migrations.run(path, () => migrate(path));
 *
 * migrations.size; // 0
 * await migrations.idle();
 *
 * // Dropped when it waited for longer than 5 seconds.
 * await migrations.run(path, () => migrate(path), { signal: AbortSignal.timeout(5000) });
 * ```
 */
export function Semaphore(options: { concurrency: number, maxWaiting: number }): Semaphore.Bounded
export function Semaphore(options: { concurrency: number }): Semaphore
export function Semaphore(options: { concurrency: number, maxWaiting?: number }): Semaphore | Semaphore.Bounded {
    const { concurrency, maxWaiting } = options
    if (!(concurrency >= 1)) throw new RangeError("Semaphore: a concurrency below 1 lets nothing run.")

    // Tasks without a key share one slot. Its key is this map itself, which no caller can pass as a key.
    const slots = new Map<unknown, Slot>()
    const idle: (() => void)[] = []
    let size = 0

    /**
     * Whether it is the turn of the caller. Returns a promise when the caller has to wait, or
     * `false` when the caller may not wait.
     */
    function acquire(key: unknown, signal: AbortSignal | undefined): boolean | Promise<void> {
        let slot = slots.get(key)
        if (!slot) slots.set(key, slot = { active: 0, waiting: [] })

        if (slot.active < concurrency) {
            slot.active++
            size++
            return true
        }

        if (maxWaiting !== undefined && slot.waiting.length >= maxWaiting) return false
        size++
        return wait(slot, signal)
    }

    function wait(slot: Slot, signal: AbortSignal | undefined): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!signal) return void slot.waiting.push(resolve)

            // Something runs while this one waits, so neither the slot nor `idle` can be done with when it is aborted.
            const waiting = {
                abort: (): void => {
                    slot.waiting.splice(slot.waiting.indexOf(waiting.start), 1)
                    size--
                    reject(signal.reason)
                },
                start: (): void => {
                    signal.removeEventListener("abort", waiting.abort)
                    resolve()
                },
            }
            slot.waiting.push(waiting.start)
            signal.addEventListener("abort", waiting.abort, { once: true })
        })
    }

    function release(key: unknown): void {
        const slot = slots.get(key)!
        size--

        // The next one takes over the turn.
        const next = slot.waiting.shift()
        if (next) return next()

        if (--slot.active === 0) slots.delete(key)
        if (size === 0) {
            for (const resolve of idle.splice(0)) resolve()
        }
    }

    /**
     * Resolves with `full` instead of calling `fn` when `fn` may not wait. A function that does not
     * have to wait is called right away.
     */
    async function run(key: unknown, fn: Fn, signal: AbortSignal | undefined, full: unknown): Promise<unknown> {
        signal?.throwIfAborted()
        const turn = acquire(key, signal)
        if (turn === false) return full
        if (turn !== true) await turn
        try { return await fn() }
        finally { release(key) }
    }

    const full = Symbol("full")

    return {
        idle: () => size === 0 ? Promise.resolve() : new Promise((resolve) => idle.push(resolve)),
        run(a: Fn | PropertyKey, b?: Fn | Semaphore.RunOptions, c?: Semaphore.RunOptions): never {
            const hasKey = typeof a !== "function"
            const key = hasKey ? a : slots
            const fn = (hasKey ? b : a) as Fn
            const signal = (hasKey ? c : b as Semaphore.RunOptions | undefined)?.signal
            if (maxWaiting === undefined) return run(key, fn, signal, full) as never

            return ResultAsync.from(async () => {
                const result = await run(key, fn, signal, full)
                return result === full ? Err({ message: "Too many are waiting already", name: "SemaphoreFullError" }) : Ok(result)
            }) as never
        },
        get size() {
            return size
        },
    }
}
