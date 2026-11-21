import type { ReplicasOptions } from "../src/replicas"
import { describe, expect, it } from "bun:test"
import { transformReplicas } from "../src/replicas"

const options: ReplicasOptions = {
    resolve: (replica, name) => `@monstermann/stdlib/${replica}/${name}`,
    sources: (replica) => ["@monstermann/stdlib", `@monstermann/stdlib/${replica}/index`],
    replicas: {
        Array: ["map", "removeAll"],
        Map: ["delete", "map"],
        Math: ["clamp"],
    },
}

const imported = `import { Array, Map, Math } from "@monstermann/stdlib";`

function run(code: string): string | undefined {
    return transformReplicas(dedent(code), "source.ts", options)?.toString()
}

function dedent(code: string): string {
    const lines = code.split("\n").filter((line, i, lines) => line.trim() || (i > 0 && i < lines.length - 1))
    const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)![0].length))
    return lines.map((line) => line.slice(indent)).join("\n")
}

describe("transformReplicas", () => {
    it("should import what is used from the file it lives in, and remove the import of the replica", () => {
        expect(run(`
            ${imported}const a = Array.removeAll(values, [1]);
            const b = Math.clamp(a.length, 0, 5);
        `)).toBe(dedent(`
            import { removeAll as _removeAll } from "@monstermann/stdlib/Array/removeAll";import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp";const a = _removeAll(values, [1]);
            const b = _clamp(a.length, 0, 5);
        `))
        expect(run(`import { Map as M } from "@monstermann/stdlib/Map/index"; M.delete(a, b);`)).toBe(`import { delete as _delete } from "@monstermann/stdlib/Map/delete"; _delete(a, b);`)
    })

    it("should import something once", () => {
        expect(run(`
            ${imported}Array.removeAll(a, b);
            Array.removeAll(c, d);
        `)).toBe(dedent(`
            import { removeAll as _removeAll } from "@monstermann/stdlib/Array/removeAll";_removeAll(a, b);
            _removeAll(c, d);
        `))
    })

    it("should keep every line where it is", () => {
        expect(run(`
            import { Math } from "@monstermann/stdlib"

            ;(Math.clamp)(a, 0, 1)
            b()
        `)).toBe(dedent(`
            import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp";

            ;(_clamp)(a, 0, 1)
            b()
        `))
    })

    it("should keep directives first", () => {
        expect(run(`
            "use client";
            ${imported}Math.clamp(a, 0, 1);
        `)).toBe(dedent(`
            "use client";
            import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp";_clamp(a, 0, 1);
        `))
    })

    it("should remove the import of a replica that is only used like the native one", () => {
        expect(run(`
            ${imported}Array.from(a);
            const b = new Map();
            b instanceof (Map);
            Map.groupBy(c, d);
            Math.max(e, f);
            values.map(x => x);
        `)).toBe(dedent(`
            Array.from(a);
            const b = new Map();
            b instanceof (Map);
            Map.groupBy(c, d);
            Math.max(e, f);
            values.map(x => x);
        `))
    })

    it("should keep the other imports next to a replica", () => {
        expect(run(`import { pipe, Map, type Result } from "@monstermann/stdlib"; new Map();`)).toBe(`import { pipe, type Result } from "@monstermann/stdlib"; new Map();`)
    })

    it("should leave what has been declared in the file alone", () => {
        expect(run(`
            import { Math } from "./math";
            import { Array } from "@monstermann/stdlib";
            Math.clamp(a, 0, 1);
            function run(Array) {
                return Array.removeAll(a, b);
            }
            Array.removeAll(a, b);
        `)).toBe(dedent(`
            import { removeAll as _removeAll } from "@monstermann/stdlib/Array/removeAll";import { Math } from "./math";

            Math.clamp(a, 0, 1);
            function run(Array) {
                return Array.removeAll(a, b);
            }
            _removeAll(a, b);
        `))
    })

    it("should leave what is not a replica alone", () => {
        expect(run(`import { Map } from "other"; Map.delete(a, b);`)).toBe(undefined)
        expect(run(`import type { Map } from "@monstermann/stdlib"; let a: Map;`)).toBe(undefined)
        expect(run(`Map.delete(a, b);`)).toBe(undefined)
    })

    it("should replace what is passed along as a value", () => {
        expect(run(`
            ${imported}signal(Array.removeAll);
            typeof Math.clamp;
        `)).toBe(dedent(`
            import { removeAll as _removeAll } from "@monstermann/stdlib/Array/removeAll";import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp";signal(_removeAll);
            typeof _clamp;
        `))
    })

    it("should support names that are reserved words", () => {
        expect(run(`${imported}Map.delete(map, key);`)).toBe(`import { delete as _delete } from "@monstermann/stdlib/Map/delete";_delete(map, key);`)
    })

    it("should tell apart what is called the same", () => {
        expect(run(`
            ${imported}const _map = 1;
            Array.map(a, f);
            Map.map(b, f);
        `)).toBe(dedent(`
            import { map as _map1 } from "@monstermann/stdlib/Array/map";import { map as _map2 } from "@monstermann/stdlib/Map/map";const _map = 1;
            _map1(a, f);
            _map2(b, f);
        `))
    })

    it("should tell names and types apart from what is used", () => {
        expect(run(`
            ${imported}o.Math;
            const a = { Math: 1 };
            class B { Math = 1; Map() {} }
            Math: for (;;) break Math;
            const c: Map<string, number> = d;
        `)).toBe(dedent(`
            o.Math;
            const a = { Math: 1 };
            class B { Math = 1; Map() {} }
            Math: for (;;) break Math;
            const c: Map<string, number> = d;
        `))
    })

    it("should replace what is used in enums", () => {
        expect(run(`${imported}enum A { B = Math.clamp(1, 0, 2) }`)).toBe(`import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp";enum A { B = _clamp(1, 0, 2) }`)
    })

    it("should see through what is put around a replica", () => {
        expect(run(`${imported}(Math).clamp(a, 0, 1);`)).toBe(`import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp";_clamp(a, 0, 1);`)
        expect(run(`${imported}Math!.clamp(a, 0, 1);`)).toContain(`_clamp(a, 0, 1);`)
        expect(run(`${imported}(Math as any).clamp(a, 0, 1);`)).toContain(`_clamp(a, 0, 1);`)
    })

    it("should find what is written in unusual ways", () => {
        expect(run(`${imported}Math /* a */ .clamp(a, 0, 1);`)).toContain(`_clamp(a, 0, 1);`)
        expect(run(`
            ${imported}Math
                // a
                .clamp(a, 0, 1);
        `)).toContain(`_clamp(a, 0, 1);`)
        expect(run(`${imported}Math. /* a */ clamp(a, 0, 1);`)).toContain(`_clamp(a, 0, 1);`)
        expect(run(`${imported}Math?.clamp(a, 0, 1);`)).toContain(`_clamp(a, 0, 1);`)
    })

    it("should keep the import of a replica that is used in other ways", () => {
        const cases = [
            `call(Math);`,
            `export { Math };`,
            `export default Math;`,
            `const a = { Math };`,
            `const { clamp } = Math;`,
            `const { clamp } = Math as any;`,
            `const { clamp, max: { a } } = Math;`,
            `const { clamp = () => 0 } = Math;`,
            `const { ["clamp"]: a } = Math;`,
            `let clamp; ({ clamp } = Math);`,
            `function a({ clamp } = Math) {}`,
            `Math["clamp"](a, 0, 1);`,
            `Math?.["clamp"](a, 0, 1);`,
            "Math[`clamp`](a, 0, 1);",
            `Math.clamp = () => 0;`,
            `Math.clamp ??= a;`,
            `delete Math.clamp;`,
            `[Math.clamp] = [a];`,
            `({ a: Math.clamp } = b);`,
            `Math.clamp++;`,
        ]
        for (const code of cases) expect(run(`import { Math } from "@monstermann/stdlib"; ${code}`)).toBe(undefined)
        expect(run(`import { Math } from "@monstermann/stdlib"; call(Math); Math.clamp(a, 0, 1);`)).toBe(`import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp";import { Math } from "@monstermann/stdlib"; call(Math); _clamp(a, 0, 1);`)
    })

    it("should not replace types", () => {
        expect(run(`import { Math } from "@monstermann/stdlib"; type Clamp = typeof Math.clamp;`)).toBe(` type Clamp = typeof Math.clamp;`)
    })
})
