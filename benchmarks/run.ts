import Path from "node:path"
import { stdlibBun } from "../packages/stdlib-transform/src/plugin"

// Runs a benchmark of this folder, every case in a process of its own, and prints a table. benchmarks/bench.sh runs all of them.
//
//   bun benchmarks/run.ts match                     # in Bun, without stdlib-transform
//   bun benchmarks/run.ts match --runtime=node      # in Node
//   bun benchmarks/run.ts match --transform         # through stdlib-transform
//
// Without the transform, globals come from @monstermann/stdlib/patch. NODE_ENV is production, for the libraries compared against.

const dir = import.meta.dirname
const src = Path.resolve(dir, "../packages/stdlib/src")
const args = process.argv.slice(2)
const name = args.find((arg) => !arg.startsWith("--"))
const runtime = args.find((arg) => arg.startsWith("--runtime="))?.slice("--runtime=".length) ?? "bun"
const transform = args.includes("--transform")

if (!name) throw new Error("Which benchmark? bun benchmarks/run.ts <name> [--runtime=bun|node] [--transform]")
if (runtime !== "bun" && runtime !== "node") throw new Error(`--runtime is bun or node, not ${runtime}`)

const file = await build(name, transform)
const cases = (await run("bun", file)).trim().split("\n")
const engine = runtime === "node" ? "V8" : "JavaScriptCore"
console.log(`\n${name}, ${engine}${transform ? ", through stdlib-transform" : ""}\n`)
console.log(runtime === "node" ? "| | Ops/s | B/op |\n|---|---|---|" : "| | Ops/s |\n|---|---|")
for (const kase of cases) {
    const { bytes, ns } = JSON.parse(await run(runtime, file, kase)) as { bytes?: number, ns: number }
    console.log(bytes === undefined ? `| ${kase} | ${rate(ns)} |` : `| ${kase} | ${rate(ns)} | ${size(bytes)} |`)
}

async function build(name: string, transform: boolean): Promise<string> {
    const result = await Bun.build({
        define: { "process.env.NODE_ENV": '"production"' },
        entrypoints: [Path.join(dir, `${name}.ts`)],
        outdir: Path.join(dir, ".dist", transform ? "transformed" : "patched"),
        target: "node",
        plugins: [
            {
                name: "stdlib-sources",
                setup(build) {
                    // From the sources, to not depend on a build. Without the transform, importing the types of globals makes them available for real.
                    build.onResolve({ filter: /^@monstermann\/stdlib\// }, ({ path }) => {
                        const file = path.slice("@monstermann/stdlib/".length).replace(/\.mjs$/, "")
                        return { path: Path.join(src, `${!transform && file === "globals" ? "patch" : file}.ts`) }
                    })
                },
            },
            // Only the benchmarks themselves: the sources of stdlib are what is being measured, as they are.
            ...transform ? [stdlibBun({ exclude: /[\\/]packages[\\/]/ })] : [],
        ],
    })
    if (!result.success) throw new AggregateError(result.logs, `Failed to build ${name}`)
    return result.outputs[0]!.path
}

async function run(runtime: "bun" | "node", file: string, kase?: string): Promise<string> {
    const cmd = [runtime, file, ...kase === undefined ? [] : [kase]]
    const child = Bun.spawn(cmd, { stderr: "inherit" })
    const output = await new Response(child.stdout).text()
    if (await child.exited !== 0) throw new Error(`Failed: ${cmd.join(" ")}`)
    // Only the last line: a benchmark may print before.
    return kase === undefined ? output : output.trim().split("\n").at(-1)!
}

/** Calls per second, from nanoseconds per call: 37 ns is 27M. */
function rate(ns: number): string {
    const ops = 1e9 / ns
    const [value, unit] = ops >= 1e9 ? [ops / 1e9, "B"] : ops >= 1e6 ? [ops / 1e6, "M"] : ops >= 1e3 ? [ops / 1e3, "K"] : [ops, ""]
    return `${value < 10 ? value.toFixed(1) : value.toFixed(0)}${unit}`
}

function size(bytes: number): string {
    if (bytes >= 1000) return `${(bytes / 1000).toFixed(bytes >= 100_000 ? 0 : 1)} KB`
    return `${Math.max(0, bytes).toFixed(0)} B`
}
