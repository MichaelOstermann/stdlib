import Path from "node:path"
import { stdlibBun } from "../packages/stdlib-transform/src/plugin"

// Runs benchmarks, each case in a process of its own, in V8 (Node) and JavaScriptCore (Bun): bun benchmarks/run.ts [name …]
// Bundled through stdlib-transform, with NODE_ENV set to production for the libraries compared against.

const dir = import.meta.dirname
const src = Path.resolve(dir, "../packages/stdlib/src")
const out = Path.join(dir, ".dist")

const names = process.argv.slice(2)
const all = ["copy-on-write", "libraries", "match"]

for (const name of names.length ? names : all) {
    const build = await Bun.build({
        define: { "process.env.NODE_ENV": '"production"' },
        entrypoints: [Path.join(dir, `${name}.ts`)],
        outdir: out,
        target: "node",
        plugins: [
            // What the transform imports from the published package comes from its sources, to not depend on a build.
            {
                name: "stdlib-sources",
                setup(build) {
                    build.onResolve({ filter: /^@monstermann\/stdlib\// }, ({ path }) => ({
                        path: Path.join(src, path.slice("@monstermann/stdlib/".length).replace(/\.mjs$/, ".ts")),
                    }))
                },
            },
            // Only the benchmarks themselves: the sources of stdlib are what is being measured, as they are.
            stdlibBun({ exclude: /[\\/]packages[\\/]/ }),
        ],
    })
    if (!build.success) throw new AggregateError(build.logs, `Failed to build ${name}`)
    const file = build.outputs[0]!.path

    const cases: string[] = JSON.parse(await run("bun", file))
    console.log(`\n${name}\n\n| | V8 | JSC | Bytes (V8) |\n|---|---|---|---|`)
    for (const kase of cases) {
        const v8 = JSON.parse(await run("node", file, kase))
        const jsc = JSON.parse(await run("bun", file, kase))
        console.log(`| ${kase} | ${time(v8.ns)} | ${time(jsc.ns)} | ${size(v8.bytes)} |`)
    }
}

async function run(...cmd: string[]): Promise<string> {
    const process = Bun.spawn(cmd, { stderr: "inherit" })
    const output = await new Response(process.stdout).text()
    if (await process.exited !== 0) throw new Error(`Failed: ${cmd.join(" ")}`)
    return output
}

function time(ns: number): string {
    if (ns >= 1000) return `${(ns / 1000).toFixed(1)} µs`
    return `${ns < 10 ? ns.toFixed(1) : ns.toFixed(0)} ns`
}

function size(bytes: number): string {
    if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`
    return `${Math.max(0, bytes).toFixed(0)} B`
}
