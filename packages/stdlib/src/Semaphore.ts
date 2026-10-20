import { Err, Ok } from "./Result"
import { ResultAsync } from "./ResultAsync"

/** What a semaphore with `maxWaiting` fails with when that many are waiting already. */
export class SemaphoreFullError extends Error {
    override readonly name = "SemaphoreFullError"
}

/** Runs functions, a limited number of them at the same time. The others wait for their turn, in the order they came in. */
export interface Semaphore {
    /**
     * Calls `fn` once it is its turn, and resolves or rejects with what it does.
     * With a `key`, the limit is the one of that key: functions of different keys do not wait for each other.
     */
    run: (<T>(fn: () => PromiseLike<T> | T) => Promise<Awaited<T>>) & (<T>(key: PropertyKey, fn: () => PromiseLike<T> | T) => Promise<Awaited<T>>)
    /** How many functions are running or waiting. */
    readonly size: number
    /** Resolves once nothing is running or waiting, right away when that is the case already. */
    idle: () => Promise<void>
}

/** A semaphore that only lets a limited number wait, and fails for the ones beyond that. */
export interface BoundedSemaphore extends Omit<Semaphore, "run"> {
    /**
     * Calls `fn` once it is its turn, and succeeds with what it returns. Fails right away when too many are waiting already.
     * With a `key`, the limits are the ones of that key: functions of different keys do not wait for each other.
     */
    run: (<T>(fn: () => PromiseLike<T> | T) => ResultAsync<Awaited<T>, SemaphoreFullError>) & (<T>(key: PropertyKey, fn: () => PromiseLike<T> | T) => ResultAsync<Awaited<T>, SemaphoreFullError>)
}

interface Slot {
    active: number
    waiting: (() => void)[]
}

type Fn = () => unknown

/**
 * `Semaphore(options)`
 *
 * Creates something that runs functions, `concurrency` of them at the same time, the others wait for their turn.
 *
 * - `run(fn)` is a pool, or a queue with a `concurrency` of `1`
 * - `run(key, fn)` is a lock: the limit applies to each key on its own
 * - with `maxWaiting`, `run` returns a `ResultAsync` that fails with a `SemaphoreFullError` instead of letting more than that wait
 *
 * ```ts
 * const hashing = Semaphore({ concurrency: 2, maxWaiting: 100 });
 * const hash = await hashing.run(() => Bun.password.hash(password));
 * // Result<string, SemaphoreFullError>
 *
 * const migrations = Semaphore({ concurrency: 1 });
 * await migrations.run(path, () => migrate(path));
 *
 * migrations.size; // 0
 * await migrations.idle();
 * ```
 */
export function Semaphore(options: { concurrency: number, maxWaiting: number }): BoundedSemaphore
export function Semaphore(options: { concurrency: number }): Semaphore
export function Semaphore(options: { concurrency: number, maxWaiting?: number }): BoundedSemaphore | Semaphore {
    const { concurrency, maxWaiting } = options
    if (!(concurrency >= 1)) throw new RangeError("Semaphore: a concurrency below 1 lets nothing run.")

    // Tasks without a key share one slot. Its key is this map itself, which no caller can pass as a key.
    const slots = new Map<unknown, Slot>()
    const idle: (() => void)[] = []
    let size = 0

    /** Whether it is the turn of the caller, a promise of that when it has to wait, or `false` when it is not allowed to. */
    function acquire(key: unknown): boolean | Promise<void> {
        let slot = slots.get(key)
        if (!slot) slots.set(key, slot = { active: 0, waiting: [] })

        if (slot.active < concurrency) {
            slot.active++
            size++
            return true
        }

        if (maxWaiting !== undefined && slot.waiting.length >= maxWaiting) return false
        size++
        return new Promise((resolve) => slot.waiting.push(resolve))
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

    /** Resolves with `full` instead of calling `fn` when it is not allowed to wait. A function that does not have to wait is called right away. */
    async function run(key: unknown, fn: Fn, full: unknown): Promise<unknown> {
        const turn = acquire(key)
        if (turn === false) return full
        if (turn !== true) await turn

        try {
            return await fn()
        }
        finally {
            release(key)
        }
    }

    const full = Symbol("full")

    return {
        idle: () => size === 0 ? Promise.resolve() : new Promise((resolve) => idle.push(resolve)),
        run(...args: [fn: Fn] | [key: PropertyKey, fn: Fn]): never {
            const [key, fn] = args.length === 1 ? [slots, args[0]] : args
            if (maxWaiting === undefined) return run(key, fn, full) as never

            return ResultAsync.from(async () => {
                const result = await run(key, fn, full)
                return result === full ? Err(new SemaphoreFullError("Too many are waiting already.")) : Ok(result)
            }) as never
        },
        get size() {
            return size
        },
    }
}
