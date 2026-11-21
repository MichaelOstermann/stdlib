/** What a package exports, for importing each of it from the file it lives in. */
export interface Package {
    /** Everything that is not a namespace, and the file it lives in: `pipe` → `pipe`. */
    functions: ReadonlyMap<string, string>
    /** Each member is a file of the same name: `Duration.parse` → `Duration/parse`. */
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
    ["Array", "Array/index"],
    ["AsyncEmitter", "Emitter"],
    ["batch", "batch"],
    ["Effect", "Effect"],
    ["Emitter", "Emitter"],
    ["Err", "Result"],
    ["ErrAsync", "ResultAsync"],
    ["Failure", "Failure"],
    ["Function", "Function/index"],
    ["JSON", "JSON/index"],
    ["Map", "Map/index"],
    ["match", "match"],
    ["Math", "Math/index"],
    ["Memo", "Memo"],
    ["Object", "Object/index"],
    ["Ok", "Result"],
    ["OkAsync", "ResultAsync"],
    ["peek", "peek"],
    ["pipe", "pipe"],
    ["Promise", "Promise/index"],
    ["Result", "Result"],
    ["ResultAsync", "ResultAsync"],
    ["Semaphore", "Semaphore"],
    ["SemaphoreFullError", "Semaphore"],
    ["Set", "Set/index"],
    ["Signal", "Signal"],
    ["String", "String/index"],
])

/**
 * The packages whose imports are pointed at the files they live in, by what they are imported from.
 */
export const packages: ReadonlyMap<string, Package> = new Map([
    ["@monstermann/stdlib", { functions, namespaces }],
    ["@monstermann/stdlib-embed", { functions: new Map(), namespaces: new Set(["OEmbed"]) }],
    ["@monstermann/stdlib-syntax-highlight", { functions: new Map(), namespaces: new Set(["Syntax"]) }],
    ["@monstermann/stdlib-web", { functions: new Map(), namespaces: new Set(["DOM", "Placement", "Rect", "Shortcut"]) }],
])
