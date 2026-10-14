import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import Path from "node:path"
import { describe, expect, it } from "bun:test"
import { rolldown } from "rolldown"
import { stdlib, stdlibBun } from "../src"
import { globals, values } from "../src/globals.manifest"
import { functions, guards, namespaces } from "../src/manifest"

const entry = Path.join(import.meta.dirname, "__fixtures__/entry.ts")
const src = Path.resolve(import.meta.dirname, "../../stdlib/src")

/** Resolves the files of the published package to their sources, to not depend on a build. */
function resolveSource(path: string): string | undefined {
    if (!path.startsWith("@monstermann/stdlib/")) return
    return Path.join(src, path.slice("@monstermann/stdlib/".length).replace(/\.mjs$/, ".ts"))
}

async function evaluate(code: string): Promise<unknown> {
    const dir = await mkdtemp(Path.join(tmpdir(), "stdlib-transform-"))
    await Bun.write(Path.join(dir, "bundle.mjs"), code)
    const { result } = await import(Path.join(dir, "bundle.mjs"))
    await rm(dir, { recursive: true })
    return result
}

describe("manifest", () => {
    it("should list everything @monstermann/stdlib exports", async () => {
        const exports = Object.keys(await import("../../stdlib/src/index")).sort()
        expect([...namespaces, ...functions.keys()].sort()).toEqual(exports)
    })

    it("should match the files of @monstermann/stdlib", async () => {
        for (const name of namespaces) expect(await Bun.file(Path.join(src, name, "index.ts")).exists()).toBe(true)
        for (const [name, file] of functions) expect(name in await import(Path.join(src, `${file}.ts`))).toBe(true)
        for (const name of guards) expect(await Bun.file(Path.join(src, `${name}.ts`)).exists()).toBe(true)
        for (const [name, file] of Object.entries(values)) expect(name in await import(Path.join(src, file))).toBe(true)
    })

    it("should list everything @monstermann/stdlib makes available on globals", async () => {
        for (const [global, names] of Object.entries(globals)) {
            // An object of functions that is a global of its own, like Duration.
            if (global in values) {
                expect([...names]).toEqual(Object.keys((await import(Path.join(src, values[global]!)))[global]).sort())
                continue
            }

            const files = await Array.fromAsync(new Bun.Glob("*.ts").scan(Path.join(src, global)))
            expect([...names]).toEqual(files.map(file => file.slice(0, -3)).sort())
            // Nothing that exists already. The tests run patched (bunfig.toml), so a name may be there as long as it is ours.
            for (const name of names) {
                const existing = (globalThis as never)[global][name]
                if (existing !== undefined) expect(existing).toBe((await import(Path.join(src, global, `${name}.ts`)))[name])
            }
        }

        for (const [name, file] of Object.entries(values)) {
            const existing = (globalThis as never)[name]
            if (existing !== undefined) expect(existing).toBe((await import(Path.join(src, file)))[name])
        }
    })
})

describe("stdlib", () => {
    it("should skip files that are excluded or not included", () => {
        const code = `import { Duration } from "@monstermann/stdlib";\nDuration.parse(a);`
        const plugin = stdlib({ exclude: /skipped/ })
        expect(plugin.transform.handler(code, "/a/b.ts")?.code).toContain("_parse(a)")
        expect(plugin.transform.handler(code, "/a/skipped.ts")).toBe(undefined)
        expect(plugin.transform.handler(code, "/a/b.css")).toBe(undefined)
    })

    it("should leave dependencies alone", () => {
        const code = `Array.removeAll(a, b);`
        expect(stdlib().transform.handler(code, "/a/b.ts")?.code).toContain("_removeAll(a, b)")
        expect(stdlib().transform.handler(code, "/a/node_modules/b/c.ts")).toBe(undefined)
        expect(stdlib().transform.handler(code, "node_modules/b/c.ts")).toBe(undefined)
        expect(stdlib().transform.handler(code, "C:\\a\\node_modules\\b\\c.ts")).toBe(undefined)
        expect(stdlib({ exclude: /\.test\.ts$/ }).transform.handler(code, "/a/node_modules/b/c.ts")).toBe(undefined)
    })

    it("should transform every kind of module", () => {
        const code = `Array.removeAll(a, b);`
        for (const path of ["/a/b.js", "/a/b.jsx", "/a/b.ts", "/a/b.tsx", "/a/b.mjs", "/a/b.mts", "/a/b.ts?v=1", "/a/b.tsx?react"]) {
            expect(stdlib().transform.handler(code, path)?.code).toContain("_removeAll(a, b)")
        }
        for (const path of ["/a/b.css", "/a/b.json", "/a/b.cjs", "/a/b.cts", "/a/b.ts.map"]) {
            expect(stdlib().transform.handler(code, path)).toBe(undefined)
        }
    })

    it("should only bundle what is used, without relying on the bundler to tree-shake", async () => {
        const bundle = await rolldown({
            input: entry,
            plugins: [stdlib(), { name: "sources", resolveId: resolveSource }],
            treeshake: false,
        })
        const { output } = await bundle.generate({ format: "esm" })
        const code = output[0].code

        expect(await evaluate(code)).toBe("one")
        expect(code).not.toContain("debounce")
        expect(code).not.toContain("translate")
        expect(code).not.toContain("replaceFirst")
        expect(code).not.toContain("did not run")
        expect(code).not.toContain("Pattern matching error")
    })
})

describe("stdlib, with hmr", () => {
    const code = `import "@monstermann/stdlib/globals";\nEffect(() => {});`

    it("should be enabled for the dev server of Vite, unless it is said otherwise", () => {
        const plugin = stdlib()
        expect(plugin.transform.handler(code, "/a/b.ts")?.code).not.toContain("import.meta.hot")
        plugin.configResolved({ command: "build" })
        expect(plugin.transform.handler(code, "/a/b.ts")?.code).not.toContain("import.meta.hot")
        plugin.configResolved({ command: "serve" })
        expect(plugin.transform.handler(code, "/a/b.ts")?.code).toContain("import.meta.hot")

        const disabled = stdlib({ hmr: false })
        disabled.configResolved({ command: "serve" })
        expect(disabled.transform.handler(code, "/a/b.ts")?.code).not.toContain("import.meta.hot")
        expect(stdlib({ hmr: true }).transform.handler(code, "/a/b.ts")?.code).toContain("import.meta.hot")
    })
})

describe("stdlibBun", () => {
    it("should work as a plugin of Bun.build", async () => {
        const result = await Bun.build({
            entrypoints: [entry],
            plugins: [
                { name: "sources", setup: build => void build.onResolve({ filter: /^@monstermann\/stdlib\// }, ({ path }) => ({ path: resolveSource(path)! })) },
                stdlibBun(),
            ],
        })
        const code = await result.outputs[0]!.text()

        expect(await evaluate(code)).toBe("one")
        expect(code).not.toContain("debounce")
        expect(code).not.toContain("did not run")
    })

    it("should leave dependencies alone", async () => {
        const loaders: ((args: { loader: string, path: string }) => Promise<{ contents: string }>)[] = []
        stdlibBun().setup<string>({ onLoad: (_, callback) => loaders.push(callback) })
        const dir = await mkdtemp(Path.join(tmpdir(), "stdlib-transform-"))
        await Bun.write(Path.join(dir, "a.ts"), "Array.removeAll(a, b);")
        await Bun.write(Path.join(dir, "node_modules/b/c.ts"), "Array.removeAll(a, b);")

        expect((await loaders[0]!({ loader: "ts", path: Path.join(dir, "a.ts") })).contents).toContain("_removeAll(a, b)")
        expect((await loaders[0]!({ loader: "ts", path: Path.join(dir, "node_modules/b/c.ts") })).contents).toBe("Array.removeAll(a, b);")
        await rm(dir, { recursive: true })
    })
})
