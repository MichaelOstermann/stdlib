import Path from "node:path"
import { describe, expect, it } from "bun:test"
import { batch } from "../../src/batch"
import { isBatching } from "../../src/internals/reactivity"
import { peek } from "../../src/peek"
import { Signal } from "../../src/Signal"
import { effect } from "./helpers"

const src = Path.resolve(import.meta.dirname, "../../src")
const registry = `globalThis[Symbol.for("@monstermann/stdlib/reactivity")]`

/** Runs in a process of its own, where nothing has been loaded yet. */
function run(code: string): { ok: boolean, output: string } {
    const result = Bun.spawnSync(["bun", "--eval", code], { cwd: src, stderr: "pipe", stdout: "pipe" })
    return { ok: result.exitCode === 0, output: `${result.stdout}${result.stderr}`.trim() }
}

describe("batch", () => {
    it("should run effects once it is done", () => {
        const $a = Signal(0)
        const $b = Signal(0)
        const seen: number[][] = []
        effect(() => void seen.push([$a(), $b()]))

        const result = batch(() => {
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

        expect(isBatching()).toBe(false)
        batch.start()
        batch.start()
        $a(1)
        batch.end()
        expect(isBatching()).toBe(true)
        expect(seen).toEqual([0])
        batch.end()
        expect(isBatching()).toBe(false)
        expect(seen).toEqual([0, 1])
    })

    it("should end when something throws, and throw what an effect throws", () => {
        const $a = Signal(0)
        effect(() => {
            if ($a() === 1) throw new Error("effect")
        })

        expect(() => batch(() => {
            throw new Error("fn")
        })).toThrow("fn")
        expect(isBatching()).toBe(false)

        expect(() => batch(() => $a(1))).toThrow("effect")
        expect(isBatching()).toBe(false)
    })
})

describe("peek", () => {
    it("should not depend on what is read", () => {
        const $a = Signal(0)
        const $b = Signal(0)
        const seen: number[][] = []
        effect(() => void seen.push([$a(), peek($b)]))

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
            peek.start()
            try { $a() }
            finally { peek.end() }
            seen.push($b())
        })

        $a(1)
        expect(seen).toEqual([0])
        $b(1)
        expect(seen).toEqual([0, 1])
    })

    it("should ignore an end without a start", () => {
        peek.end()
        expect(peek(() => 1)).toBe(1)
    })
})

describe("reactivity", () => {
    it("should batch and untrack without loading signals", () => {
        const result = run(`
            import { batch } from "./batch";
            import { isBatching } from "./internals/reactivity";
            import { peek } from "./peek";
            batch.start();
            const inside = batch(() => isBatching());
            batch.end();
            console.log(JSON.stringify([inside, isBatching(), peek(() => 1), ${registry}.system ?? null]));
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
            const { batch } = await import("./batch");
            console.log(batch(() => 1));
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
            await import("./batch");
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
