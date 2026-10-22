import v8 from "node:v8"

// Started by benchmarks/run.ts once per case, with the name of the case as the argument: only that one is measured,
// in a process of its own, so shared functions only see the calls of that one case. Without an argument, the names are listed.

const only = process.argv[2]

/**
 * Measures `fn(input)`, printing `{ name, ns, bytes }` per call. Bytes are what V8 allocated, `undefined` in Bun, whose count is not reliable.
 *
 * - `fn` gets `input` from an array at an index that changes: passed directly, an engine may see that every call returns the same, and make the call once
 * - doubles the calls until a round takes 20 ms, warms up for half a second, then takes the fastest of 7 rounds
 */
export function bench<T>(name: string, input: T, fn: (input: T) => unknown): void {
    if (only === undefined) return console.log(name)
    if (name !== only) return

    // Not a copy of `input`: one with another layout makes `fn` slower for having seen both.
    const inputs = [input, input]
    let result: unknown
    const round = (calls: number): number => {
        const start = performance.now()
        for (let i = 0; i < calls; i++) result = fn(inputs[i & 1]!)
        return performance.now() - start
    }

    let calls = 1
    while (round(calls) < 20) calls *= 2
    // Doubling alone is too short a warm-up for V8 to optimize what a slow call calls: copying 1000 items measured 6 µs instead of 2 µs.
    for (const start = performance.now(); performance.now() - start < 500;) round(calls)

    let ns = Infinity
    let bytes: number | undefined
    for (let i = 0; i < 7; i++) {
        const before = allocated()
        ns = Math.min(ns, round(calls) * 1e6 / calls)
        const after = allocated()
        if (before !== undefined && after !== undefined) bytes = (after - before) / calls
    }
    // Using the result, so the calls can not be dropped.
    if (result === inputs) console.log()
    console.log(JSON.stringify({ bytes, name, ns }))
}

function allocated(): number | undefined {
    if ("Bun" in globalThis) return undefined
    return (v8.getHeapStatistics() as { total_allocated_bytes?: number }).total_allocated_bytes
}
