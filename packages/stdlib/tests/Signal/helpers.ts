import { Batch } from "../../src/Batch"
import { RawEffect, RawMemo } from "../../src/internals/system"
import { Signal } from "../../src/Signal"
import { Untrack } from "../../src/Untrack"

/**
 * What the tests of the system are written with, until `Effect` and `Memo` are here:
 * the least that turns a `RawEffect` and a `RawMemo` into what they will be.
 */
export const signal = Signal
export const batch = Batch
export const untrack = Untrack
export const peek = Untrack

let current: (() => void) | undefined

export function effect(computation: () => unknown): () => void {
    let cleanup: unknown
    let disposed = false

    const runCleanup = (): void => {
        const fn = cleanup
        cleanup = undefined
        if (typeof fn === "function") Batch(() => Untrack(fn as () => void))
    }

    const raw = new RawEffect(() => {
        const prev = current
        // eslint-disable-next-line @typescript-eslint/no-use-before-define -- only called once it is defined
        current = dispose
        try {
            runCleanup()
            if (disposed) return
            cleanup = computation()
            if (disposed) runCleanup()
        }
        finally {
            current = prev
        }
    })

    const dispose = (): void => {
        if (disposed) return
        disposed = true
        Batch(() => Untrack(() => {
            try { runCleanup() }
            finally { raw.dispose() }
        }))
    }

    raw.run()
    return dispose
}

export function disposeEffect(): void {
    current?.()
}

export function memo<T>(computation: () => T): () => T {
    const raw = new RawMemo(computation)
    return () => raw.get()
}
