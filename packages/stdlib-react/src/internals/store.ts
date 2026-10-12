import type { Memo, ReadonlySignal } from "@monstermann/stdlib"
import { Memo as createMemo, Effect, Untrack } from "@monstermann/stdlib"

/** What can be read and depended on: a signal, a memo, or a function that reads some. */
export type Readable<T> = ReadonlySignal<T> | Memo<T> | (() => T)

/** A signal or a memo as it is, a function as a memo: it only tells about a change when it returns something else. */
export function toSignal<T>(value: Readable<T>): () => T {
    return "kind" in value ? value : createMemo(value)
}

/** Calls `onChange` whenever what `read` reads changed, and returns what stops that. */
export function subscribe(read: () => unknown, onChange: () => void): () => void {
    let isFirst = true
    return Effect(() => {
        read()
        if (!isFirst) Untrack(onChange)
        isFirst = false
    }).dispose
}
