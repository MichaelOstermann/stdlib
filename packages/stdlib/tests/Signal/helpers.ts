import type { EffectContext } from "../../src/Effect"
import { batch } from "../../src/batch"
import { Effect } from "../../src/Effect"
import { Memo } from "../../src/Memo"
import { peek } from "../../src/peek"
import { Signal } from "../../src/Signal"

/** The names the tests of the system were written with, which came from `@monstermann/signals`. */
export const signal = Signal
export { batch, peek }
export const untrack = peek
export const memo = Memo
export const indexed = Memo.indexed
export const deferEffect = Effect.defer

const running: EffectContext[] = []

export function effect(computation: () => unknown): () => void {
    return Effect(function () {
        running.push(this)
        try { return (computation as () => void)() }
        finally { running.pop() }
    })
}

/**
 * Disposes the effect that is running, which the tests of the system do without having it at hand.
 */
export function disposeEffect(): void {
    running.at(-1)?.dispose()
}
