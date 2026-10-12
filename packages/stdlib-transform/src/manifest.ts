/** The namespaces of @monstermann/stdlib, each member is a file of the same name: `Duration.parse` → `Duration/parse.mjs`. */
export const namespaces: ReadonlySet<string> = new Set([
    "Bytes",
    "Duration",
    "Retry",
])

/** Everything else @monstermann/stdlib exports, and the file it lives in: `pipe` → `pipe.mjs`. */
export const functions: ReadonlyMap<string, string> = new Map([
    ["_", "_"],
    ["AsyncEmitter", "Emitter"],
    ["Batch", "Batch"],
    ["Context", "Context"],
    ["Disposer", "Disposer"],
    ["Effect", "Effect"],
    ["Emitter", "Emitter"],
    ["Err", "Result"],
    ["ErrAsync", "ResultAsync"],
    ["match", "match"],
    ["Memo", "Memo"],
    ["Ok", "Result"],
    ["OkAsync", "ResultAsync"],
    ["pipe", "pipe"],
    ["Result", "Result"],
    ["ResultAsync", "ResultAsync"],
    ["Semaphore", "Semaphore"],
    ["SemaphoreFullError", "Semaphore"],
    ["Signal", "Signal"],
    ["Untrack", "Untrack"],
])

/** Files that are only there for when the code runs as it is written. */
export const guards: readonly string[] = [
    "globals",
    "patch",
]
