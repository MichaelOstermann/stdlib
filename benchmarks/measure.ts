import v8 from "node:v8"

/**
 * A case makes the call that is measured `calls` times, in a loop of its own, and returns the last result, so the calls can not be optimized away:
 *
 * ```ts
 * (calls) => {
 *     let result
 *     for (let i = 0; i < calls; i++) result = Array.map(items, fn)
 *     return result
 * }
 * ```
 *
 * Not a function that is called in a loop of `measure`: one more function around the call is enough for JavaScriptCore to inline less, which makes small calls look twice as slow.
 */
export type Case = (calls: number) => unknown

/**
 * Measures the case named by the first argument and prints `{ ns, bytes }` per call, or the names of all cases without one.
 * Meant to be run by `benchmarks/run.ts`, which starts a process of its own for every case.
 *
 * - doubles the calls until a round takes 20 ms, which also warms it up, then takes the fastest of 7 rounds
 * - bytes are what V8 allocated, counted by `total_allocated_bytes`: `undefined` in Bun, which has no such counter
 */
export function measure(cases: Record<string, Case>): void {
    const name = process.argv[2]
    if (!name) return console.log(JSON.stringify(Object.keys(cases)))
    const fn = cases[name]
    if (!fn) throw new Error(`No case named "${name}".`)

    let calls = 1
    while (round(fn, calls) < 20) calls *= 2

    let ns = Infinity
    let bytes: number | undefined
    for (let i = 0; i < 7; i++) {
        const before = allocated()
        ns = Math.min(ns, round(fn, calls) * 1e6 / calls)
        const after = allocated()
        if (before !== undefined && after !== undefined) bytes = (after - before) / calls
    }
    console.log(JSON.stringify({ bytes, ns }))
}

/** Milliseconds `calls` calls take. */
function round(fn: Case, calls: number): number {
    const start = performance.now()
    fn(calls)
    return performance.now() - start
}

function allocated(): number | undefined {
    return (v8.getHeapStatistics() as { total_allocated_bytes?: number }).total_allocated_bytes
}
