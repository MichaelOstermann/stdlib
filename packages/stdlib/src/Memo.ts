import { RawMemo } from "./internals/system"

/** A value that is computed from signals and other memos: call it to read. */
export interface Memo<T = any> {
    /** Returns the value, computed again when something it read changed. Inside of a memo or an effect, that one runs again when the value changes. */
    (): T
    readonly kind: "Memo"
}

export interface MemoOptions<T> {
    /** Whether two values are the same, for what reads the memo to not run again. Only asked when they are not `===`. */
    equals?: (before: T, after: T) => boolean
}

/** A memo of a map, and of each of its entries. */
export interface MemoIndex<K, V> extends Memo<ReadonlyMap<K, V>> {
    /** Returns a memo of the entry of `key`, which only changes when that entry does. They are created when asked for, and held weakly. */
    for: (key: K) => Memo<V | undefined>
    /** Returns the entry of `key`. Inside of a memo or an effect, that one only runs again when that entry changes. */
    get: (key: K) => V | undefined
}

/**
 * `Memo(computation, options?)`
 *
 * Creates a value that is computed from signals and other memos, and kept until one of them changes.
 *
 * - it is lazy: nothing is computed until it is read, or until an effect depends on it
 * - what reads it does not run again when it computes the value it had already, `equals` extends what counts as the same
 * - what `computation` throws is thrown by what reads the memo
 *
 * ```ts
 * const $count = Signal(1);
 * const $double = Memo(() => $count() * 2);
 *
 * $double(); // 2
 * $count(2);
 * $double(); // 4
 *
 * const $people = Signal<Person[]>([{ id: 0, name: "Ada" }]);
 * const $peopleById = Memo.indexed($people, person => [person.id, person]);
 *
 * $peopleById(); // ReadonlyMap<number, Person>
 * $peopleById.get(0); // Person | undefined
 * $peopleById.for(0); // Memo<Person | undefined>
 * ```
 */
export const Memo: {
    <T>(computation: () => T, options?: MemoOptions<NoInfer<T>>): Memo<T>
    /**
     * Creates a memo of a map from a list, `by` returns the key and the value of an element.
     * The map stays the same when none of its entries changed, `equals` compares the values of an entry.
     *
     * `for(key)` and `get(key)` depend on a single entry instead of the whole list.
     */
    indexed: <T, K, V>(target: () => readonly T[], by: (value: NoInfer<T>) => [K, V], options?: MemoOptions<V>) => MemoIndex<K, V>
} = Object.assign(create, { indexed })

function create<T>(computation: () => T, options?: MemoOptions<NoInfer<T>>): Memo<T> {
    const equals = options?.equals
    let init = false
    let prev: T

    const raw = new RawMemo<T>(equals
        ? () => {
            const next = computation()
            if (init && (prev === next || equals(prev, next))) return prev
            init = true
            return prev = next
        }
        : computation)

    const memo = (() => raw.get()) as { kind: "Memo" } & Memo<T>
    memo.kind = "Memo"

    return memo
}

function indexed<T, K, V>(target: () => readonly T[], by: (value: NoInfer<T>) => [K, V], options?: MemoOptions<V>): MemoIndex<K, V> {
    const equals = options?.equals
    const cache = new Map<K, WeakRef<Memo<V | undefined>>>()
    const finalizers = new FinalizationRegistry<{ key: K, ref: WeakRef<Memo<V | undefined>> }>(({ key, ref }) => {
        if (cache.get(key) === ref) cache.delete(key)
    })

    let prevIdx = new Map<K, V>()
    const index = create<Map<K, V>>(() => {
        let hasChanges = false
        const nextIdx = new Map<K, V>()
        for (const entry of target()) {
            const [key, nextVal] = by(entry)
            if (prevIdx.has(key)) {
                const prevVal = prevIdx.get(key) as V
                // Equal entries keep their previous value, so what reads them does not see a change.
                if (prevVal === nextVal || equals?.(prevVal, nextVal) === true) {
                    nextIdx.set(key, prevVal)
                    continue
                }
            }
            hasChanges = true
            nextIdx.set(key, nextVal)
        }
        hasChanges ||= nextIdx.size !== prevIdx.size
        return hasChanges ? prevIdx = nextIdx : prevIdx
    }) as unknown as MemoIndex<K, V>

    index.for = (key) => {
        const existing = cache.get(key)?.deref()
        if (existing) return existing
        const memo = create(() => index().get(key))
        const ref = new WeakRef(memo)
        cache.set(key, ref)
        finalizers.register(memo, { key, ref })
        return memo
    }

    index.get = (key) => index.for(key)()

    return index
}
