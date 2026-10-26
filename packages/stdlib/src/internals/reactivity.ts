import type { RawEffect, RawMemo } from "./system"
import { version } from "../../package.json"

/**
 * The state behind batching and tracking, without the signals themselves.
 *
 * An `Emitter` batches and untracks through this module. Until a signal is created, that costs a
 * counter and one stack slot: the graph lives in `./system`, which is only loaded by the modules
 * that create signals, memos and effects.
 */

interface Registry {
    /** The version that signals have been created with. */
    system: string | undefined
    /** Every version of this package that has been loaded. */
    versions: string[]
}

// Registered globally, for the copies of this package to find each other.
const key = Symbol.for("@monstermann/stdlib/reactivity")
const registry = ((globalThis as { [key]?: Registry })[key] ??= { system: undefined, versions: [] })
if (!registry.versions.includes(version)) registry.versions.push(version)
if (registry.system !== undefined) assertSingleVersion()

/**
 * Signals of one version do not know the effects of another: nothing would update, without anything
 * failing. Two copies of the same version are accepted, because a module that is replaced during
 * development shows up as a second copy.
 */
function assertSingleVersion(): void {
    if (registry.versions.length === 1) return
    throw new Error(`@monstermann/stdlib: signals need a single version of this package, ${registry.versions.join(" and ")} have been loaded.`)
}

// Exported as mutable bindings, so signals read them without a function call. Only this module writes them.
// eslint-disable-next-line import/no-mutable-exports
export let batchDepth = 0
// The effect or memo that is currently collecting dependencies. `evalStack` holds the ones it interrupted.
// eslint-disable-next-line import/no-mutable-exports
export let evalContext: RawEffect | RawMemo | undefined
let evalDepth = 0
const evalStack: (RawEffect | RawMemo | undefined)[] = []
let flush: (() => void) | undefined

/**
 * Makes `run` what the outermost batch ends with. It has to call `exitBatch` once it is done,
 * before it throws.
 */
export function connect(run: () => void): void {
    registry.system = version
    assertSingleVersion()
    flush = run
}

export function pushContext(context: RawEffect | RawMemo | undefined): void {
    evalStack[evalDepth++] = evalContext
    evalContext = context
}

/**
 * Makes `context` the one that collects dependencies and returns the previous one, for a caller to
 * restore it from its own stack frame instead of `evalStack`.
 */
export function swapContext(context: RawEffect | RawMemo | undefined): RawEffect | RawMemo | undefined {
    const prev = evalContext
    evalContext = context
    return prev
}

export function popContext(): void {
    evalContext = evalStack[--evalDepth]
    evalStack[evalDepth] = undefined
}

export function isBatching(): boolean {
    return batchDepth > 0
}

export function startBatch(): void {
    batchDepth++
}

export function endBatch(): void {
    // Without signals there are no effects to run.
    if (batchDepth > 1 || flush === undefined) batchDepth--
    else flush()
}

export function exitBatch(): void {
    batchDepth--
}

export function batch<T>(fn: () => T): T {
    if (batchDepth > 0) return fn()
    startBatch()

    try { return fn() }
    finally { endBatch() }
}

export function pauseTracking(): void {
    pushContext(undefined)
}

export function resumeTracking(): void {
    if (evalDepth > 0) popContext()
}

export function untrack<T>(fn: () => T): T {
    if (evalContext === undefined) return fn()
    pauseTracking()

    try { return fn() }
    finally { resumeTracking() }
}
