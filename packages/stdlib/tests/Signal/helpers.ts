import { Batch } from "../../src/Batch"
import { Effect } from "../../src/Effect"
import { Memo } from "../../src/Memo"
import { Signal } from "../../src/Signal"
import { Untrack } from "../../src/Untrack"

/** The names the tests of the system were written with, which came from `@monstermann/signals`. */
export const signal = Signal
export const batch = Batch
export const untrack = Untrack
export const peek = Untrack
export const memo = Memo
export const indexed = Memo.indexed
export const deferEffect = Effect.defer

const running: Effect[] = []

/** Returns what disposes the effect, which is what an effect used to be. */
export function effect(computation: () => unknown): () => void {
    const effect = Effect((effect) => {
        running.push(effect)
        try { return (computation as () => void)() }
        finally { running.pop() }
    })
    return () => effect.dispose()
}

/** Disposes the effect that is running, which the tests of the system do without having it at hand. */
export function disposeEffect(): void {
    running.at(-1)?.dispose()
}
