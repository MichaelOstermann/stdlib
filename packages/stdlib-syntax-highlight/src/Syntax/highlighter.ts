import type { Highlighter, Token } from "."
import { batch, Memo, peek, Set, Signal } from "@monstermann/stdlib"
import { grammars } from "../grammars"
import { tokenClasses } from "./internals/tokenClasses"

// What crates/stdlib-syntax-highlight exports
type Wasm = {
    memory: WebAssembly.Memory
    alloc: (length: number) => number
    dealloc: (pointer: number, length: number) => void
    highlight: (scope: number, scopeLength: number, code: number, codeLength: number) => number
    highlight_len: () => number
    init: () => void
    load: (scope: number, scopeLength: number, json: number, jsonLength: number) => void
}

/**
 * # highlighter
 *
 * Starts a highlighter from the bytes of `@monstermann/stdlib-syntax-highlight/highlight.wasm`.
 * Start one per page or worker. An `ArrayBuffer` makes the highlighter ready at once. A `Response`
 * makes the highlighter ready once the bytes have arrived.
 *
 * `load` fetches the grammars for the `scope` of a language from `Syntax.languages`. Repeated calls
 * fetch only once. The promise resolves when the grammars are loaded.
 *
 * `highlight` tokenizes code synchronously. Before its scope is loaded, `highlight` returns no
 * tokens. The tokens cover the whole code, line breaks included. The `class` of a token says what
 * the token is, so the app can color it. After an edit, highlighting the same scope again only
 * tokenizes the changed lines.
 *
 * - `$ready`: whether the wasm is started
 * - `$loading`: the scopes whose grammars are being loaded
 * - `$loaded`: the scopes that can be highlighted
 *
 * ## Example
 *
 * ```ts
 * import wasmUrl from "@monstermann/stdlib-syntax-highlight/highlight.wasm?url";
 *
 * const highlighter = Syntax.highlighter(fetch(wasmUrl));
 * await highlighter.load("source.rust");
 * highlighter.highlight("let a = 1", "source.rust");
 * // [
 * //     { class: "keyword", length: 3 },
 * //     { class: undefined, length: 1 },
 * //     { class: "variable", length: 1 },
 * //     { class: undefined, length: 1 },
 * //     { class: "operator", length: 1 },
 * //     { class: undefined, length: 1 },
 * //     { class: "number", length: 1 },
 * // ]
 * ```
 */
export function highlighter(buffer: ArrayBuffer | Response | Promise<Response>): Highlighter {
    const encoder = new TextEncoder()
    const $wasm = Signal<Wasm>(undefined)
    const $ready = Memo(() => !!$wasm())
    const $loading = Signal<ReadonlySet<string>>(new Set())
    const $loaded = Signal<ReadonlySet<string>>(new Set())
    const scopes = new Map<string, Promise<void>>()

    const wasm = (buffer instanceof ArrayBuffer
        ? Promise.resolve(new WebAssembly.Instance(new WebAssembly.Module(buffer)))
        : Promise
            .resolve(buffer)
            .then((response) => response.arrayBuffer())
            .then((bytes) => WebAssembly.instantiate(bytes))
            .then(({ instance }) => instance))
        .then((instance) => {
            const exports = instance.exports as Wasm
            exports.init()
            $wasm(exports)
            return exports
        })

    // Calls `fn` with the strings written to the wasm's memory as pointers and lengths
    const call = <T>(wasm: Wasm, strings: string[], fn: (...args: number[]) => T): T => {
        const args: number[] = []
        for (const string of strings) {
            const encoded = encoder.encode(string)
            const pointer = wasm.alloc(encoded.length)
            new Uint8Array(wasm.memory.buffer, pointer, encoded.length).set(encoded)
            args.push(pointer, encoded.length)
        }
        const result = fn(...args)
        for (let i = 0; i < args.length; i += 2) wasm.dealloc(args[i]!, args[i + 1]!)
        return result
    }

    const loadScope = function (scope: string): Promise<void> {
        const pending = scopes.get(scope)
        if (pending) return pending
        const entry = grammars[scope]!.load().then(async (module) => {
            const w = await wasm
            call(w, [scope, module.default], w.load)
        })
        scopes.set(scope, entry)
        return entry
    }

    return {
        $loaded,
        $loading,
        $ready,
        highlight(text, scope) {
            const wasm = peek($wasm)
            if (!wasm || !peek($loaded).has(scope)) return []
            const pointer = call(wasm, [scope, text], wasm.highlight)
            const data = new Uint32Array(wasm.memory.buffer, pointer, wasm.highlight_len())
            const tokens: Token[] = []
            for (let i = 0; i < data.length; i += 2) tokens.push({ class: tokenClasses[data[i + 1]! - 1], length: data[i]! })
            return tokens
        },
        async load(scope) {
            const scopes = getScopes(scope)
            const scopesToLoad = scopes
                .difference(peek($loaded))
                .difference(peek($loading))
            $loading((loading) => Set.union(loading, scopesToLoad))
            await Promise.all(Array.from(scopes).map(loadScope))
            batch(() => {
                $loaded((loaded) => Set.union(loaded, scopes))
                $loading((loading) => Set.difference(loading, scopes))
            })
        },
    }
}

function getScopes(scope: string): Set<string> {
    const found = new Set<string>()
    const visit = (next: string) => {
        if (found.has(next)) return
        found.add(next)
        for (const include of grammars[next]!.includes) visit(include)
    }
    if (scope in grammars) visit(scope)
    return found
}
