import Path from "node:path"
import { describe, expect, it } from "bun:test"
import { Batch } from "../../src/Batch"
import { Signal } from "../../src/Signal"
import { Untrack } from "../../src/Untrack"
import { effect } from "./helpers"

const src = Path.resolve(import.meta.dirname, "../../src")
const registry = `globalThis[Symbol.for("@monstermann/stdlib/reactivity")]`

/** Runs in a process of its own, where nothing has been loaded yet. */
function run(code: string): { ok: boolean, output: string } {
    const result = Bun.spawnSync(["bun", "--eval", code], { cwd: src, stderr: "pipe", stdout: "pipe" })
    return { ok: result.exitCode === 0, output: `${result.stdout}${result.stderr}`.trim() }
}

describe("Batch", () => {
    it("should run effects once it is done", () => {
        const $a = Signal(0)
        const $b = Signal(0)
        const seen: number[][] = []
        effect(() => void seen.push([$a(), $b()]))

        const result = Batch(() => {
            $a(1)
            $b(1)
            return "done"
        })

        expect(result).toBe("done")
        expect(seen).toEqual([[0, 0], [1, 1]])
    })

    it("should last from start to end, the outermost one runs effects", () => {
        const $a = Signal(0)
        const seen: number[] = []
        effect(() => void seen.push($a()))

        expect(Batch.isActive()).toBe(false)
        Batch.start()
        Batch.start()
        $a(1)
        Batch.end()
        expect(Batch.isActive()).toBe(true)
        expect(seen).toEqual([0])
        Batch.end()
        expect(Batch.isActive()).toBe(false)
        expect(seen).toEqual([0, 1])
    })

    it("should end when something throws, and throw what an effect throws", () => {
        const $a = Signal(0)
        effect(() => {
            if ($a() === 1) throw new Error("effect")
        })

        expect(() => Batch(() => {
            throw new Error("fn")
        })).toThrow("fn")
        expect(Batch.isActive()).toBe(false)

        expect(() => Batch(() => $a(1))).toThrow("effect")
        expect(Batch.isActive()).toBe(false)
    })
})

describe("Untrack", () => {
    it("should not depend on what is read", () => {
        const $a = Signal(0)
        const $b = Signal(0)
        const seen: number[][] = []
        effect(() => void seen.push([$a(), Untrack($b)]))

        $b(1)
        expect(seen).toEqual([[0, 0]])
        $a(1)
        expect(seen).toEqual([[0, 0], [1, 1]])
    })

    it("should last from start to end", () => {
        const $a = Signal(0)
        const $b = Signal(0)
        const seen: number[] = []
        effect(() => {
            Untrack.start()
            try { $a() }
            finally { Untrack.end() }
            seen.push($b())
        })

        $a(1)
        expect(seen).toEqual([0])
        $b(1)
        expect(seen).toEqual([0, 1])
    })

    it("should ignore an end without a start", () => {
        Untrack.end()
        expect(Untrack(() => 1)).toBe(1)
    })
})

describe("reactivity", () => {
    it("should batch and untrack without loading signals", () => {
        const result = run(`
            import { Batch } from "./Batch";
            import { Untrack } from "./Untrack";
            Batch.start();
            const inside = Batch(() => Batch.isActive());
            Batch.end();
            console.log(JSON.stringify([inside, Batch.isActive(), Untrack(() => 1), ${registry}.system ?? null]));
        `)
        expect(result).toEqual({ ok: true, output: "[true,false,1,null]" })
    })

    it("should say which version signals have been created with", () => {
        const result = run(`
            import "./Signal";
            const { system, versions } = ${registry};
            console.log(system === versions[0], versions.length);
        `)
        expect(result).toEqual({ ok: true, output: "true 1" })
    })

    it("should let several versions batch, as long as there are no signals", () => {
        const result = run(`
            ${registry} = { system: undefined, versions: ["0.0.0-other"] };
            const { Batch } = await import("./Batch");
            console.log(Batch(() => 1));
        `)
        expect(result).toEqual({ ok: true, output: "1" })
    })

    it("should not create signals next to another version", () => {
        const result = run(`
            ${registry} = { system: undefined, versions: ["0.0.0-other"] };
            await import("./Signal");
        `)
        expect(result.ok).toBe(false)
        expect(result.output).toContain("signals need a single version of this package, 0.0.0-other and ")
    })

    it("should not load next to the signals of another version", () => {
        const result = run(`
            ${registry} = { system: "0.0.0-other", versions: ["0.0.0-other"] };
            await import("./Batch");
        `)
        expect(result.ok).toBe(false)
        expect(result.output).toContain("signals need a single version of this package, 0.0.0-other and ")
    })

    it("should load twice as the same version", () => {
        const result = run(`
            await import("./Signal");
            await import("./internals/reactivity.ts?again");
            await import("./internals/system.ts?again");
            console.log(${registry}.versions.length);
        `)
        expect(result).toEqual({ ok: true, output: "1" })
    })
})
