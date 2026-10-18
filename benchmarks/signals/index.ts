import { Batch } from "../../packages/stdlib/src/Batch"
import { Effect } from "../../packages/stdlib/src/Effect"
import { Memo } from "../../packages/stdlib/src/Memo"
import { Signal } from "../../packages/stdlib/src/Signal"
import { Untrack } from "../../packages/stdlib/src/Untrack"

// Times graphs of signals, memos and effects, ns per operation: bun benchmarks/signals/index.ts
// For V8: bun build benchmarks/signals/index.ts --target=node --outfile=/tmp/signals.mjs && node /tmp/signals.mjs

const rounds = 15

let sink = 0
let i = 0

/** Builds a graph, and returns one operation on it. */
type Benchmark = [name: string, setup: () => () => void]

const benchmarks: Benchmark[] = [
    ["create, 1 signal + memo + effect", () => () => {
        const $a = Signal(i++)
        const $b = Memo(() => $a() * 2)
        Effect(() => void (sink += $b())).dispose()
    }],
    ["deep: 100 memos in a row", () => {
        const $a = Signal(0)
        let $last: () => number = $a
        for (let k = 0; k < 100; k++) {
            const $prev = $last
            $last = Memo(() => $prev() + 1)
        }
        Effect(() => void (sink += $last()))
        return () => $a(++i)
    }],
    ["wide: 1000 effects on 1 signal", () => {
        const $a = Signal(0)
        for (let k = 0; k < 1000; k++) Effect(() => void (sink += $a()))
        return () => $a(++i)
    }],
    ["diamond: 1 → 100 memos → 1 memo", () => {
        const $a = Signal(0)
        const $mids = Array.from({ length: 100 }, () => Memo(() => $a() + 1))
        const $sum = Memo(() => $mids.reduce((sum, $mid) => sum + $mid(), 0))
        Effect(() => void (sink += $sum()))
        return () => $a(++i)
    }],
    ["fan-in: 1 effect on 1000 signals, all written", () => {
        const $all = Array.from({ length: 1000 }, () => Signal(0))
        Effect(() => {
            for (const $a of $all) sink += $a()
        })
        return () => Batch(() => {
            const value = ++i
            for (const $a of $all) $a(value)
        })
    }],
    ["stable: 1 effect on 100 signals, 1 written", () => {
        const $all = Array.from({ length: 100 }, () => Signal(0))
        Effect(() => {
            for (const $a of $all) sink += $a()
        })
        return () => $all[0]!(++i)
    }],
    ["repeated: 1 effect reads 10 signals 10 times", () => {
        const $all = Array.from({ length: 10 }, () => Signal(0))
        Effect(() => {
            for (let k = 0; k < 10; k++) {
                for (const $a of $all) sink += $a()
            }
        })
        return () => $all[0]!(++i)
    }],
    ["dynamic: 1 effect switches between 2x20 signals", () => {
        const $which = Signal(true)
        const $a = Array.from({ length: 20 }, () => Signal(1))
        const $b = Array.from({ length: 20 }, () => Signal(2))
        Effect(() => {
            for (const $x of $which() ? $a : $b) sink += $x()
        })
        return () => $which(!$which())
    }],
    ["cutoff: memo stays the same, 100 effects", () => {
        const $a = Signal(0)
        const $zero = Memo(() => $a() & 0)
        for (let k = 0; k < 100; k++) Effect(() => void (sink += $zero()))
        return () => $a(++i)
    }],
    // What useSignal(() => ...) creates in every component of a list: a memo of the function, and an effect that tells React.
    ["react: mount 1000 items, useSignal(() => $selected() === id)", () => () => {
        const $selected = Signal(0)
        const effects = items($selected)
        for (const effect of effects) effect.dispose()
    }],
    ["react: 1000 items, the selection moves", () => {
        const $selected = Signal(0)
        items($selected)
        return () => $selected(++i % 1000)
    }],
    ["react: 1000 items, a write that changes none of them", () => {
        const $selected = Signal(-1)
        items($selected)
        return () => $selected(-(++i) - 1)
    }],
    ["unwatched: memo read after a write", () => {
        const $a = Signal(0)
        const $b = Memo(() => $a() * 2)
        return () => {
            $a(++i)
            sink += $b()
        }
    }],
]

/** What `useSignal(() => $selected() === id)` creates for 1000 components. */
function items($selected: Signal<number>): Effect[] {
    return Array.from({ length: 1000 }, (_, id) => {
        const $isSelected = Memo(() => $selected() === id)
        let isFirst = true
        return Effect(() => {
            $isSelected()
            if (!isFirst) Untrack(() => sink++)
            isFirst = false
        })
    })
}

/** How often each operation runs per round, for a round to take a few milliseconds. */
const repeats = 2000

const times = new Map<string, number[]>()
for (let round = 0; round < rounds; round++) {
    for (const [name, setup] of benchmarks) {
        const run = setup()
        const start = performance.now()
        for (let r = 0; r < repeats; r++) run()
        const time = performance.now() - start
        if (!times.has(name)) times.set(name, [])
        times.get(name)!.push(time)
    }
}

if (!sink) throw new Error("Nothing ran")

console.log("\nns per operation")
for (const [name] of benchmarks) {
    // The first rounds are spent warming up.
    const sorted = times.get(name)!.slice(5).sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]! * 1e6 / repeats
    console.log(`${name.padEnd(48)} ${median.toFixed(0).padStart(9)}`)
}
