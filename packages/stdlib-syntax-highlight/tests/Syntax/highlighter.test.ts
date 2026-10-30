import { readFileSync } from "node:fs"
import { describe, expect, it } from "bun:test"
import { grammars } from "../../src/grammars"
import { Syntax } from "../../src/Syntax"

const scope = (title: string) => Syntax.languages.find((language) => language.title === title)!.scope

// Built by `cargo build --release --target wasm32-unknown-unknown -p stdlib-syntax-highlight`
const wasm = readFileSync(new URL("../../../../target/wasm32-unknown-unknown/release/stdlib_syntax_highlight.wasm", import.meta.url))
const bytes = () => wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength)
const highlighter = Syntax.highlighter(bytes())
for (const title of ["CSS", "Rust", "TypeScript React"]) await highlighter.load(scope(title))

function highlight(text: string, title: string): [string, string | undefined][] {
    let at = 0
    return highlighter.highlight(text, scope(title)).map((token) => [text.slice(at, at += token.length), token.class])
}

describe("highlighter", () => {
    it("highlights Rust", async () => {
        expect(highlighter.highlight("let a = 1", scope("Rust"))).toEqual([
            { class: "keyword", length: 3 },
            { class: undefined, length: 1 },
            { class: "variable", length: 1 },
            { class: undefined, length: 1 },
            { class: "operator", length: 1 },
            { class: undefined, length: 1 },
            { class: "number", length: 1 },
        ])
    })

    it("highlights TypeScript React", async () => {
        expect(highlight('const a = <div class="x">{b}</div>', "TypeScript React")).toEqual([
            ["const", "keyword"],
            [" ", undefined],
            ["a", "variable"],
            [" ", undefined],
            ["=", "operator"],
            [" <", undefined],
            ["div", "tag"],
            [" ", undefined],
            ["class", "attribute"],
            ["=", "operator"],
            ['"x"', "string"],
            [">", undefined],
            ["{", "keyword"],
            ["b", "variable"],
            ["}", "keyword"],
            ["</", undefined],
            ["div", "tag"],
            [">", undefined],
        ])
    })

    it("highlights CSS", async () => {
        expect(highlight(".a {\n  color: red;\n}", "CSS")).toEqual([
            [".a", "attribute"],
            [" {\n  ", undefined],
            ["color", "property"],
            [": ", undefined],
            ["red", "constant"],
            [";\n}", undefined],
        ])
    })

    it("colors code inside a string as code", async () => {
        expect(highlight("`a ${b.c}`", "TypeScript React")).toEqual([
            ["`a ", "string"],
            ["${", "keyword"],
            ["b", "variable"],
            [".", undefined],
            ["c", "property"],
            ["}", "keyword"],
            ["`", "string"],
        ])
    })

    it("carries state across lines", async () => {
        expect(highlight("/* a\nb */ c", "Rust")).toEqual([
            ["/* a", "comment"],
            ["\n", undefined],
            ["b */", "comment"],
            [" ", undefined],
            ["c", "variable"],
        ])
    })

    it("starts with code that has no class", async () => {
        expect(highlight("  1", "Rust")).toEqual([
            ["  ", undefined],
            ["1", "number"],
        ])
    })

    it("gives no tokens until the language is loaded", async () => {
        const python = scope("Python")
        expect(highlighter.highlight("x = 1", python)).toEqual([])
        await highlighter.load(python)
        expect(highlighter.highlight("x = 1", python)).toContainEqual({ class: "number", length: 1 })
    })

    it("tells which scopes are loading and loaded", async () => {
        const go = scope("Go")
        const load = highlighter.load(go)
        expect(highlighter.$loading().has(go)).toBe(true)
        expect(highlighter.$loaded().has(go)).toBe(false)
        await load
        expect(highlighter.$loading().size).toBe(0)
        expect(highlighter.$loaded().has(go)).toBe(true)
    })

    it("does not depend on what highlight reads", async () => {
        const julia = scope("Julia")
        let runs = 0
        const $tokens = Memo(() => {
            runs++
            return highlighter.highlight("a = 1", julia)
        })
        $tokens()
        await highlighter.load(julia)
        $tokens()
        expect(runs).toBe(1)
    })

    it("has a scope loaded once its load resolves, while another load fetches more", async () => {
        const fresh = Syntax.highlighter(bytes())
        // JavaScript takes longer to fetch than the CSS that HTML also embeds
        const js = grammars["source.js"]!
        const load = js.load
        js.load = async () => {
            await new Promise((resolve) => setTimeout(resolve, 20))
            return load()
        }
        const html = fresh.load("text.html.basic")
        await fresh.load("source.css")
        expect(fresh.$loaded().has("source.css")).toBe(true)
        expect(fresh.$loaded().has("text.html.basic")).toBe(false)
        await html
        js.load = load
        expect(fresh.$loaded().has("text.html.basic")).toBe(true)
    })

    it("changes no signal when the language is loaded already", async () => {
        const rust = scope("Rust")
        const loaded = highlighter.$loaded()
        const loading = highlighter.$loading()
        await highlighter.load(rust)
        expect(highlighter.$loaded()).toBe(loaded)
        expect(highlighter.$loading()).toBe(loading)
    })

    it("loads once the wasm is fetched", async () => {
        const fetched = Syntax.highlighter(Promise.resolve(new Response(bytes())))
        expect(fetched.$ready()).toBe(false)
        expect(fetched.highlight("let a = 1", scope("Rust"))).toEqual([])
        await fetched.load(scope("Rust"))
        expect(fetched.$ready()).toBe(true)
        expect(fetched.highlight("let a = 1", scope("Rust"))).toContainEqual({ class: "number", length: 1 })
    })

    it("does nothing for a scope it has no grammar for", async () => {
        await highlighter.load("source.nothing")
        expect(highlighter.highlight("a", "source.nothing")).toEqual([])
    })

    it("loads each grammar once however often a language is loaded", async () => {
        // Records the scope of every grammar that reaches the tokenizer
        const loads: string[] = []
        const Instance = WebAssembly.Instance
        WebAssembly.Instance = function (module: WebAssembly.Module) {
            const exports = new Instance(module).exports as { memory: WebAssembly.Memory, load: (...args: number[]) => void }
            const load = (scope: number, scopeLength: number, json: number, jsonLength: number) => {
                loads.push(new TextDecoder().decode(new Uint8Array(exports.memory.buffer, scope, scopeLength)))
                exports.load(scope, scopeLength, json, jsonLength)
            }
            return { exports: { ...exports, load } }
        } as unknown as typeof WebAssembly.Instance
        const counted = Syntax.highlighter(bytes())
        WebAssembly.Instance = Instance

        const markdown = scope("Markdown")
        await Promise.all([counted.load(markdown), counted.load(markdown)])
        await counted.load(markdown)
        expect(loads.length).toBeGreaterThan(1)
        expect(loads.length).toBe(new Set(loads).size)
    })

    it("loads every language and the grammars it embeds", async () => {
        for (const language of Syntax.languages) {
            await highlighter.load(language.scope)
            const tokens = highlighter.highlight("a = 1 // b", language.scope)
            expect(tokens.reduce((length, token) => length + token.length, 0)).toBe(10)
        }
    })

    it("gives the same tokens when it re-tokenizes only what changed", async () => {
        const typescript = scope("TypeScript React")
        const css = scope("CSS")
        let text = readFileSync(new URL("../../src/Syntax/highlighter.ts", import.meta.url), "utf8")
        // A fixed sequence of edits that looks random, so a failure can be reproduced
        let seed = 1
        const random = (max: number) => (seed = seed * 16807 % 2147483647) % max
        const pieces = ["a", " ", "\n", "/*", "*/", "`", '"', "{", "}", "<div>", "//"]
        for (let i = 0; i < 300; i++) {
            const at = random(text.length)
            text = random(3)
                ? text.slice(0, at) + pieces[random(pieces.length)] + text.slice(at)
                : text.slice(0, at) + text.slice(at + 1 + random(40))
            const cached = highlighter.highlight(text, typescript)
            // Another language clears what the highlighter keeps, so this tokenizes everything
            highlighter.highlight("", css)
            expect(cached).toEqual(highlighter.highlight(text, typescript))
        }
    })
})
