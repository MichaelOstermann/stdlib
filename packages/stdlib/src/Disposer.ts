/* eslint-disable @typescript-eslint/no-redeclare -- Disposer is a type and what creates it */
import { brand } from "./internals/disposers"
import { endBatch, pauseTracking, resumeTracking, startBatch } from "./internals/reactivity"

// Not every runtime knows disposables yet, for example the webview of Tauri on Linux.
(Symbol as { dispose: symbol }).dispose ??= Symbol.for("Symbol.dispose")

/** What a disposer can dispose: callbacks, other disposers, and everything else that is disposable. */
export type DisposerValue = (() => void) | Disposable

/** What `onDispose` takes: nothing is fine, for `disposer.onDispose(condition && callback)`. */
export type MaybeDisposerValue = DisposerValue | false | null | undefined | void

/** Collects what needs to be cleaned up, and does so in reverse order. */
export interface Disposer extends Disposable {
    /** Disposes everything that has been added, the last first. Does nothing the second time. Ignores its arguments, so it can be passed as a callback. */
    dispose: () => void
    /** Whether this has been disposed. */
    readonly disposed: boolean
    /** Adds something to dispose, and returns it. It is disposed right away when this has been disposed already. */
    onDispose: <T extends MaybeDisposerValue>(value: T) => T
}

/** The internal shape of a disposer. Its values and the disposers it has been added to are linked lists, so an entry can be removed without searching for it. */
interface Node extends Disposer {
    [brand]: Node
    disposed: boolean
    /** The last of the disposers this has been added to. */
    dsps: Link | undefined
    /** The last of the values that have been added. */
    vals: Link | undefined
}

/** Something that is not a disposer, and has one: it is created when it is asked for. */
interface Holder {
    [brand]: () => Node
}

interface Link {
    disposer: Node
    nextVal: Link | undefined
    prevDsp: Link | undefined
    prevVal: Link | undefined
    val: DisposerValue | Node
}

type DisposeStack =
    | undefined
    | { disposer: Node, prev: DisposeStack }

/**
 * `Disposer(...values)`
 *
 * Collects callbacks, other disposers and everything else that is disposable,
 * and disposes them in reverse order.
 *
 * - a disposer that has been added to others is removed from them when it is disposed itself
 * - a value added to an already disposed disposer is disposed right away
 * - everything is disposed, also when something throws: a single error is rethrown unchanged, several are thrown as an `AggregateError`
 * - disposing is batched and untracked: effects run once everything is disposed, and nothing that is read is depended on
 * - works with `using`, and `dispose` can be passed as a callback
 *
 * ```ts
 * const a = Disposer();
 * const b = Disposer();
 *
 * a.onDispose(() => console.log(1));
 * b.onDispose(() => console.log(2));
 * a.onDispose(b);
 *
 * a.dispose(); // 2, 1
 * a.disposed; // true
 * b.disposed; // true
 *
 * promise.finally(a.dispose);
 * ```
 */
export const Disposer: {
    (...values: MaybeDisposerValue[]): Disposer
    /** Whether `value` is a disposer, also one of another copy of this package. */
    is: (value: unknown) => value is Disposer
} = Object.assign(create, { is })

function create(...values: MaybeDisposerValue[]): Disposer {
    const node: Node = {
        [brand]: undefined as never,
        disposed: false,
        dsps: undefined,
        [Symbol.dispose]: undefined as never,
        vals: undefined,
        dispose: () => disposeNode(node),
        onDispose: value => add(node, value),
    }
    node[brand] = node
    node[Symbol.dispose] = node.dispose
    for (const value of values) add(node, value)
    return node
}

function is(value: unknown): value is Disposer {
    return value != null && typeof value === "object" && brand in value
}

/** The disposer that something is or has. */
function nodeOf(value: DisposerValue): Node | undefined {
    const node = (value as Partial<Holder | Node>)[brand]
    return typeof node === "function" ? node() : node
}

function add<T extends MaybeDisposerValue>(node: Node, value: T): T {
    if (!value) return value

    const child = nodeOf(value)
    if (child) {
        if (child === node || child.disposed) return value
        if (node.disposed) child.dispose()
        else linkDsp(child, linkVal(node, createLink(node, child)))
        return value
    }

    if (!node.disposed) {
        linkVal(node, createLink(node, value))
        return value
    }

    startBatch()
    pauseTracking()
    try {
        if (typeof value === "function") value()
        else value[Symbol.dispose]()
    }
    finally {
        resumeTracking()
        endBatch()
    }
    return value
}

function disposeNode(root: Node): void {
    // Nothing to dispose, which is also what the second time looks like.
    if (!root.vals && !root.dsps) return void (root.disposed = true)

    let errors: unknown[] | undefined
    let stack: DisposeStack = { disposer: root, prev: undefined }
    let disposer: Node | undefined = root

    startBatch()
    pauseTracking()
    try {
        while (disposer) {
            let child: Node | undefined
            disposer.disposed = true

            while (disposer.dsps) {
                unlinkVal(disposer.dsps)
                disposer.dsps = disposer.dsps.prevDsp
            }

            while (disposer.vals) {
                const val: DisposerValue | Node = disposer.vals.val
                disposer.vals = disposer.vals.prevVal

                if (isNode(val)) {
                    child = val
                    break
                }

                try {
                    if (typeof val === "function") val()
                    else val[Symbol.dispose]()
                }
                catch (error) {
                    errors ??= []
                    errors.push(error)
                }
            }

            // Continue with the child, to come back for the remaining values afterwards.
            if (child) stack = { disposer: child, prev: stack }
            else stack = stack?.prev
            disposer = stack?.disposer
        }
    }
    finally {
        resumeTracking()
        endBatch()
    }

    if (!errors) return
    if (errors.length === 1) throw errors[0]
    throw new AggregateError(errors, "DisposeError")
}

function isNode(value: DisposerValue | Node): value is Node {
    return typeof value === "object" && brand in value
}

function createLink(disposer: Node, val: DisposerValue | Node): Link {
    return {
        disposer,
        nextVal: undefined,
        prevDsp: undefined,
        prevVal: undefined,
        val,
    }
}

function linkVal(disposer: Node, link: Link): Link {
    link.prevVal = disposer.vals
    if (disposer.vals) disposer.vals.nextVal = link
    disposer.vals = link
    return link
}

function linkDsp(disposer: Node, link: Link): Link {
    link.prevDsp = disposer.dsps
    disposer.dsps = link
    return link
}

function unlinkVal(link: Link): void {
    if (link.prevVal) link.prevVal.nextVal = link.nextVal
    if (link.nextVal) link.nextVal.prevVal = link.prevVal
    if (link.disposer.vals === link) link.disposer.vals = link.prevVal
    link.nextVal = link.prevVal = undefined
}
