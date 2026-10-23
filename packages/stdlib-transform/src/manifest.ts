/** What a package exports, for importing each of it from the file it lives in. */
export interface Package {
    /** Everything that is not a namespace, and the file it lives in: `pipe` → `pipe.mjs`. */
    functions: ReadonlyMap<string, string>
    /** Each member is a file of the same name: `Duration.parse` → `Duration/parse.mjs`. */
    namespaces: ReadonlySet<string>
}

/** The namespaces of @monstermann/stdlib. */
export const namespaces: ReadonlySet<string> = new Set([
    "Bytes",
    "Color",
    "Duration",
    "Interval",
    "Retry",
])

/** Everything else @monstermann/stdlib exports. */
export const functions: ReadonlyMap<string, string> = new Map([
    ["_", "_"],
    ["Action", "Action"],
    ["AsyncEmitter", "Emitter"],
    ["batch", "batch"],
    ["Effect", "Effect"],
    ["Emitter", "Emitter"],
    ["Err", "Result"],
    ["ErrAsync", "ResultAsync"],
    ["match", "match"],
    ["Memo", "Memo"],
    ["Ok", "Result"],
    ["OkAsync", "ResultAsync"],
    ["peek", "peek"],
    ["pipe", "pipe"],
    ["Result", "Result"],
    ["ResultAsync", "ResultAsync"],
    ["Semaphore", "Semaphore"],
    ["SemaphoreFullError", "Semaphore"],
    ["Signal", "Signal"],
])

/** The packages whose imports are pointed at the files they live in, by what they are imported from. */
export const packages: ReadonlyMap<string, Package> = new Map([
    ["@monstermann/stdlib", { functions, namespaces }],
    ["@monstermann/stdlib-web", { functions: new Map(), namespaces: new Set(["DOM", "Placement", "Rect", "Shortcut"]) }],
])

/** Files that only exist for running the code untransformed. */
export const guards: readonly string[] = [
    "globals",
    "patch",
]
