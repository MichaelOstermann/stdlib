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
export const onCleanup = Effect.onCleanup
export const currentEffect = Effect.current
export const deferEffect = Effect.defer

/** Returns what disposes the effect, which is what an effect used to be. */
export function effect(computation: () => unknown): () => void {
    return Effect(computation as () => void).dispose
}

export function hasEffect(): boolean {
    return Effect.current() !== undefined
}

export function disposeEffect(): void {
    Effect.current()?.dispose()
}
