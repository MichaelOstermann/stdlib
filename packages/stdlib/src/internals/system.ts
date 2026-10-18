import { batchDepth, connect, endBatch, evalContext, exitBatch, popContext, pushContext, startBatch, swapContext } from "./reactivity"

type ReactiveNode = {
    nextSource: ReactiveNode | undefined
    nextTarget: ReactiveNode | undefined
    prevSource: ReactiveNode | undefined
    prevTarget: ReactiveNode | undefined
    rollbackNode: ReactiveNode | undefined
    source: RawSignal
    target: RawMemo | RawEffect
    version: number
}

type BatchSnapshot = {
    next: BatchSnapshot | undefined
    source: RawSignal
    value: unknown
    version: number
}

// Takes the place of the previous value for writes that keep the value, which can not be reverted.
const UNKNOWN = {}

const RUNNING = 1 << 0
const NOTIFIED = 1 << 1
const OUTDATED = 1 << 2
const DISPOSED = 1 << 3
const HAS_ERROR = 1 << 4
const TRACKING = 1 << 5

let batchedEffect: RawEffect | undefined
let batchIteration = 0
let version = 0
let batchSnapshots: BatchSnapshot | undefined
// Changes whenever a target stops being notified, so a signal can tell
// whether all of its targets still are from its previous write.
let notifyEpoch = 1

function addDependency(signal: RawSignal): ReactiveNode | undefined {
    // Read once, it lives in another module.
    const context = evalContext
    if (context === undefined) {
        return undefined
    }

    let node = signal.node
    if (node === undefined || node.target !== context) {
        node = {
            nextSource: undefined,
            nextTarget: undefined,
            prevSource: context.sources,
            prevTarget: undefined,
            rollbackNode: node,
            source: signal,
            target: context,
            version: 0,
        }

        if (context.sources !== undefined) {
            context.sources.nextSource = node
        }
        context.sources = node
        signal.node = node

        if (context.flags & TRACKING) {
            signal.subscribe(node)
        }
        return node
    }
    else if (node.version === -1) {
        node.version = 0

        if (node.nextSource !== undefined) {
            node.nextSource.prevSource = node.prevSource

            if (node.prevSource !== undefined) {
                node.prevSource.nextSource = node.nextSource
            }

            node.prevSource = context.sources
            node.nextSource = undefined

            context.sources!.nextSource = node
            context.sources = node
        }

        return node
    }
    return undefined
}

function recordBatchSnapshot(source: RawSignal, value: unknown): void {
    // Only capture writes of the batch itself, not the ones effects do while it is flushed.
    if (batchDepth === 0 || batchIteration !== 0) return

    if (source.snapshot !== undefined) {
        if (source.value === value) source.snapshot.value = UNKNOWN
        return
    }

    batchSnapshots = source.snapshot = {
        next: batchSnapshots,
        source,
        value: source.value === value ? UNKNOWN : source.value,
        version: source.version,
    }
}

function reconcileBatchSnapshots(): void {
    let snapshot = batchSnapshots
    batchSnapshots = undefined

    while (snapshot !== undefined) {
        const source = snapshot.source
        source.snapshot = undefined
        // The value is back to what it was before the batch: Fast-forward the targets
        // that have seen that value, so they do not consider the signal to have changed.
        // Versions are never rolled back, something may have seen the ones in between.
        if (source.value === snapshot.value) {
            for (
                let node = source.targets;
                node !== undefined;
                node = node.nextTarget
            ) {
                if (node.version === snapshot.version) {
                    node.version = source.version
                }
            }
        }
        snapshot = snapshot.next
    }
}

function cleanupSources(target: RawMemo | RawEffect) {
    let node = target.sources
    let head: ReactiveNode | undefined

    while (node !== undefined) {
        const prev = node.prevSource

        if (node.version === -1) {
            node.source.unsubscribe(node)

            if (prev !== undefined) {
                prev.nextSource = node.nextSource
            }
            if (node.nextSource !== undefined) {
                node.nextSource.prevSource = prev
            }
        }
        else {
            head = node
        }

        node.source.node = node.rollbackNode
        if (node.rollbackNode !== undefined) {
            node.rollbackNode = undefined
        }

        node = prev
    }

    target.sources = head
}

function needsToRecompute(target: RawMemo | RawEffect): boolean {
    for (
        let node = target.sources;
        node !== undefined;
        node = node.nextSource
    ) {
        if (
            node.source.version !== node.version
            || !node.source.refresh()
            || node.source.version !== node.version
        ) {
            return true
        }
    }
    return false
}

function prepareSources(target: RawMemo | RawEffect) {
    for (
        let node = target.sources;
        node !== undefined;
        node = node.nextSource
    ) {
        const rollbackNode = node.source.node
        if (rollbackNode !== undefined) {
            node.rollbackNode = rollbackNode
        }
        node.source.node = node
        node.version = -1

        if (node.nextSource === undefined) {
            target.sources = node
            break
        }
    }
}

// @ts-expect-error ignore
export declare class RawSignal<T = any> {
    node: ReactiveNode | undefined
    notified: number
    snapshot: BatchSnapshot | undefined
    targets: ReactiveNode | undefined
    value: T
    version: number

    constructor(value?: T)
    get(): T
    refresh(): boolean
    set(value: T): void
    subscribe(node: ReactiveNode): void
    unsubscribe(node: ReactiveNode): void
}

// @ts-expect-error ignore
// eslint-disable-next-line @typescript-eslint/no-redeclare
export function RawSignal(this: RawSignal, value?: unknown) {
    this.node = undefined
    this.targets = undefined
    this.snapshot = undefined
    this.notified = 0
    this.value = value
    this.version = 0
}

RawSignal.prototype.refresh = function () {
    return true
}

RawSignal.prototype.subscribe = function (node: ReactiveNode) {
    const targets = this.targets
    if (targets !== node && node.prevTarget === undefined) {
        node.nextTarget = targets
        this.targets = node
        // The new target has not been notified.
        this.notified = 0

        if (targets !== undefined) {
            targets.prevTarget = node
        }
    }
}

RawSignal.prototype.unsubscribe = function (node: ReactiveNode) {
    if (this.targets !== undefined) {
        const prev = node.prevTarget
        const next = node.nextTarget
        if (prev !== undefined) {
            prev.nextTarget = next
            node.prevTarget = undefined
        }

        if (next !== undefined) {
            next.prevTarget = prev
            node.nextTarget = undefined
        }

        if (node === this.targets) {
            this.targets = next
        }
    }
}

RawSignal.prototype.get = function<T>(this: RawSignal<T>): T {
    const node = addDependency(this)
    if (node !== undefined) {
        node.version = this.version
    }
    return this.value
}

RawSignal.prototype.set = function<T>(this: RawSignal<T>, value: T): void {
    if (batchIteration > 100) {
        throw new Error("Cycle detected")
    }

    recordBatchSnapshot(this, value)
    this.value = value
    this.version++
    version++

    // Writing repeatedly inside of a batch: Everything is still notified from the previous write.
    if (this.notified === notifyEpoch) return
    this.notified = notifyEpoch

    // Notifying only sets flags and queues effects, it can not throw.
    startBatch()
    for (
        let node = this.targets;
        node !== undefined;
        node = node.nextTarget
    ) {
        node.target.notify()
    }
    endBatch()
}

export declare class RawMemo<T = any> extends RawSignal<T> {
    flags: number
    fn: () => T
    globalVersion: number
    sources?: ReactiveNode

    constructor(fn: () => T)
    get(): T
    notify(): void
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export function RawMemo(this: RawMemo, fn: () => unknown) {
    RawSignal.call(this, undefined)

    this.fn = fn
    this.sources = undefined
    this.globalVersion = version - 1
    this.flags = OUTDATED
}

RawMemo.prototype = new RawSignal() as RawMemo

RawMemo.prototype.refresh = function () {
    if (this.flags & NOTIFIED) {
        this.flags &= ~NOTIFIED
        notifyEpoch++
    }

    if (this.flags & RUNNING) {
        return false
    }

    if ((this.flags & (OUTDATED | TRACKING)) === TRACKING) {
        return true
    }
    this.flags &= ~OUTDATED

    if (this.globalVersion === version) {
        return true
    }
    this.globalVersion = version

    this.flags |= RUNNING
    if (this.version > 0 && !needsToRecompute(this)) {
        this.flags &= ~RUNNING
        return true
    }

    prepareSources(this)
    const prevContext = swapContext(this)
    try {
        const value = this.fn()
        if (
            this.flags & HAS_ERROR
            || this.value !== value
            || this.version === 0
        ) {
            this.value = value
            this.flags &= ~HAS_ERROR
            this.version++
        }
    }
    catch (err) {
        this.value = err
        this.flags |= HAS_ERROR
        this.version++
    }
    finally {
        swapContext(prevContext)
    }
    cleanupSources(this)
    this.flags &= ~RUNNING
    return true
}

RawMemo.prototype.subscribe = function (node) {
    if (this.targets === undefined) {
        this.flags |= OUTDATED | TRACKING

        for (
            let node = this.sources;
            node !== undefined;
            node = node.nextSource
        ) {
            node.source.subscribe(node)
        }
    }
    RawSignal.prototype.subscribe.call(this, node)
}

RawMemo.prototype.unsubscribe = function (node) {
    if (this.targets !== undefined) {
        RawSignal.prototype.unsubscribe.call(this, node)

        if (this.targets === undefined) {
            this.flags &= ~TRACKING

            for (
                let node = this.sources;
                node !== undefined;
                node = node.nextSource
            ) {
                node.source.unsubscribe(node)
            }
        }
    }
}

RawMemo.prototype.notify = function () {
    if (!(this.flags & NOTIFIED)) {
        this.flags |= OUTDATED | NOTIFIED

        for (
            let node = this.targets;
            node !== undefined;
            node = node.nextTarget
        ) {
            node.target.notify()
        }
    }
}

RawMemo.prototype.get = function<T>(this: RawMemo<T>): T {
    if (this.flags & RUNNING) {
        throw new Error("Cycle detected")
    }
    const node = addDependency(this)
    this.refresh()
    if (node !== undefined) {
        node.version = this.version
    }
    if (this.flags & HAS_ERROR) {
        throw this.value
    }
    return this.value
}

/** Runs with the effect, and returns what cleans up after it: called before the next run, and when the effect is disposed. */
type EffectFn = (effect: RawEffect) => (() => void) | void

// @ts-expect-error ignore
export declare class RawEffect {
    cleanup: (() => void) | void
    flags: number
    fn?: EffectFn
    nextBatchedEffect?: RawEffect
    sources?: ReactiveNode

    constructor(fn: EffectFn)
    dispose(): void
    end(): void
    notify(): void
    run(): void
    start(): void
}

// @ts-expect-error ignore
// eslint-disable-next-line @typescript-eslint/no-redeclare
export function RawEffect(this: RawEffect, fn: EffectFn) {
    this.cleanup = undefined
    this.fn = fn
    this.sources = undefined
    this.nextBatchedEffect = undefined
    this.flags = TRACKING
}

RawEffect.prototype.notify = function () {
    if (!(this.flags & NOTIFIED)) {
        this.flags |= NOTIFIED
        this.nextBatchedEffect = batchedEffect
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        batchedEffect = this
    }
}

RawEffect.prototype.start = function (this: RawEffect): void {
    if (this.flags & RUNNING) {
        throw new Error("Cycle detected")
    }
    this.flags |= RUNNING
    this.flags &= ~DISPOSED
    prepareSources(this)

    startBatch()
    pushContext(this)
}

RawEffect.prototype.end = function (this: RawEffect) {
    if (evalContext !== this) {
        throw new Error("Out-of-order effect")
    }
    cleanupSources(this)
    popContext()

    this.flags &= ~RUNNING
    if (this.flags & DISPOSED) disposeEffect(this)
    endBatch()
}

RawEffect.prototype.run = function (this: RawEffect): void {
    this.start()
    try {
        // The cleanup of the previous run can dispose the effect.
        if (this.cleanup) cleanUp(this)
        if (this.flags & DISPOSED || this.fn === undefined) return
        this.cleanup = this.fn(this)
        // Disposed by the run itself, after `dispose` looked for a cleanup.
        if (this.flags & DISPOSED && this.cleanup) cleanUp(this)
    }
    finally {
        this.end()
    }
}

RawEffect.prototype.dispose = function (this: RawEffect): void {
    this.flags |= DISPOSED
    // What the cleanup writes is batched.
    startBatch()
    try {
        if (this.cleanup) cleanUp(this)
    }
    finally {
        // While running, the sources are being collected, `end` takes care of it.
        if (!(this.flags & RUNNING)) disposeEffect(this)
        endBatch()
    }
}

/** Calls the cleanup of the last run, without tracking what it reads. */
function cleanUp(effect: RawEffect): void {
    const cleanup = effect.cleanup!
    effect.cleanup = undefined
    pushContext(undefined)
    try { cleanup() }
    finally { popContext() }
}

function disposeEffect(effect: RawEffect): void {
    for (
        let node = effect.sources;
        node !== undefined;
        node = node.nextSource
    ) {
        node.source.unsubscribe(node)
    }
    effect.fn = undefined
    effect.sources = undefined
}

/** What the outermost batch ends with: runs the effects that have been notified, and the ones they notify. */
function flush(): void {
    let error: unknown
    let hasError = false
    reconcileBatchSnapshots()

    while (batchedEffect !== undefined) {
        let effect: RawEffect | undefined = batchedEffect
        batchedEffect = undefined

        batchIteration++

        while (effect !== undefined) {
            const next: RawEffect | undefined = effect.nextBatchedEffect
            effect.nextBatchedEffect = undefined
            effect.flags &= ~NOTIFIED
            notifyEpoch++

            if (!(effect.flags & DISPOSED) && needsToRecompute(effect)) {
                try {
                    effect.run()
                }
                catch (err) {
                    if (!hasError) {
                        error = err
                        hasError = true
                    }
                }
            }
            effect = next
        }
    }
    batchIteration = 0
    exitBatch()

    if (hasError) {
        throw error
    }
}

connect(flush)
