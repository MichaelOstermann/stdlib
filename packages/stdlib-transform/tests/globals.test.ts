import type { GlobalsOptions } from "../src/globals"
import { describe, expect, it } from "bun:test"
import { transformGlobals } from "../src/globals"

const options: GlobalsOptions = {
    guards: ["@monstermann/stdlib/globals", "@monstermann/stdlib/patch"],
    resolve: (global, name) => `@monstermann/stdlib/${global}/${name}.mjs`,
    globals: {
        Array: ["map", "removeAll"],
        Duration: ["parse"],
        Map: ["delete", "map"],
        Math: ["clamp"],
    },
    values: {
        Duration: "@monstermann/stdlib/Duration/index.mjs",
        pipe: "@monstermann/stdlib/pipe.mjs",
    },
}

function run(code: string): string | undefined {
    return transformGlobals(dedent(code), "source.ts", options)?.toString()
}

function dedent(code: string): string {
    const lines = code.split("\n").filter((line, i, lines) => line.trim() || (i > 0 && i < lines.length - 1))
    const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)![0].length))
    return lines.map((line) => line.slice(indent)).join("\n")
}

describe("transformGlobals", () => {
    it("should import what is used from the file it lives in", () => {
        expect(run(`
            const a = Array.removeAll(values, [1]);
            const b = Math.clamp(a.length, 0, 5);
        `)).toBe(dedent(`
            import { removeAll as _removeAll } from "@monstermann/stdlib/Array/removeAll.mjs";import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp.mjs";const a = _removeAll(values, [1]);
            const b = _clamp(a.length, 0, 5);
        `))
    })

    it("should import something once", () => {
        expect(run(`
            Array.removeAll(a, b);
            Array.removeAll(c, d);
        `)).toBe(dedent(`
            import { removeAll as _removeAll } from "@monstermann/stdlib/Array/removeAll.mjs";_removeAll(a, b);
            _removeAll(c, d);
        `))
    })

    it("should remove the guards, and keep every line where it is", () => {
        expect(run(`import "@monstermann/stdlib/patch";`)).toBe("")
        expect(run(`
            import "@monstermann/stdlib/globals";
            import { a } from "./a";

            Math.clamp(a, 0, 1);
        `)).toBe(dedent(`
            import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp.mjs";
            import { a } from "./a";

            _clamp(a, 0, 1);
        `))
    })

    it("should keep directives first", () => {
        expect(run(`
            "use client";
            Math.clamp(a, 0, 1);
        `)).toBe(dedent(`
            "use client";
            import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp.mjs";_clamp(a, 0, 1);
        `))
    })

    it("should leave what is native alone", () => {
        expect(run(`
            Array.from(a);
            Math.max(a, b);
            values.map(x => x);
        `)).toBe(undefined)
    })

    it("should leave what has been declared in the file alone", () => {
        expect(run(`
            import { Math } from "./math";
            Math.clamp(a, 0, 1);
            function run(Array) {
                return Array.removeAll(a, b);
            }
            Array.removeAll(a, b);
        `)).toBe(dedent(`
            import { removeAll as _removeAll } from "@monstermann/stdlib/Array/removeAll.mjs";import { Math } from "./math";
            Math.clamp(a, 0, 1);
            function run(Array) {
                return Array.removeAll(a, b);
            }
            _removeAll(a, b);
        `))
    })

    it("should replace what is passed along as a value", () => {
        expect(run(`
            signal(Array.removeAll);
            typeof Math.clamp;
        `)).toBe(dedent(`
            import { removeAll as _removeAll } from "@monstermann/stdlib/Array/removeAll.mjs";import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp.mjs";signal(_removeAll);
            typeof _clamp;
        `))
    })

    it("should support names that are reserved words", () => {
        expect(run(`
            Map.delete(map, key);
        `)).toBe(dedent(`
            import { delete as _delete } from "@monstermann/stdlib/Map/delete.mjs";_delete(map, key);
        `))
    })

    it("should tell apart what is called the same", () => {
        expect(run(`
            const _map = 1;
            Array.map(a, f);
            Map.map(b, f);
        `)).toBe(dedent(`
            import { map as _map1 } from "@monstermann/stdlib/Array/map.mjs";import { map as _map2 } from "@monstermann/stdlib/Map/map.mjs";const _map = 1;
            _map1(a, f);
            _map2(b, f);
        `))
    })

    it("should reject what can not be replaced", () => {
        expect(() => run(`const { clamp } = Math;`)).toThrow("Math.clamp")
        expect(() => run(`Math["clamp"](a, 0, 1);`)).toThrow("Math.clamp")
        expect(() => run(`Math.clamp = () => 0;`)).toThrow("Math.clamp")
        expect(run(`const { max } = Math; Math["min"](a, b); Math.clamp(a, 0, 1);`)).toBe(`import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp.mjs";const { max } = Math; Math["min"](a, b); _clamp(a, 0, 1);`)
    })

    it("should import what is a global of its own", () => {
        expect(run(`
            const a = pipe(1, b);
            Duration.parse(c);
        `)).toBe(dedent(`
            import { parse as _parse } from "@monstermann/stdlib/Duration/parse.mjs";import { pipe } from "@monstermann/stdlib/pipe.mjs";const a = pipe(1, b);
            _parse(c);
        `))
    })

    it("should import an object of functions as a whole when it is used as one", () => {
        expect(run(`
            call(Duration);
            Duration.unknown();
            const { parse } = Duration;
            Duration["parse"](a);
        `)).toBe(dedent(`
            import { Duration } from "@monstermann/stdlib/Duration/index.mjs";call(Duration);
            Duration.unknown();
            const { parse } = Duration;
            Duration["parse"](a);
        `))
    })

    it("should tell names and types apart from what is used", () => {
        expect(run(`
            const a: Duration = { pipe: 1 };
            a.pipe;
            type B = typeof pipe;
            class C { pipe = 1; Duration() {} }
            pipe: for (;;) break pipe;
        `)).toBe(undefined)
        expect(run(`
            const a = { pipe };
            const b = c as Duration;
            function d(pipe) { return pipe(1); }
        `)).toBe(dedent(`
            import { pipe } from "@monstermann/stdlib/pipe.mjs";const a = { pipe };
            const b = c as Duration;
            function d(pipe) { return pipe(1); }
        `))
    })

    it("should import what is exported", () => {
        expect(run(`export { pipe as p, Duration };`)).toBe(`import { pipe } from "@monstermann/stdlib/pipe.mjs";import { Duration } from "@monstermann/stdlib/Duration/index.mjs";export { pipe as p, Duration };`)
        expect(run(`export default pipe;`)).toBe(`import { pipe } from "@monstermann/stdlib/pipe.mjs";export default pipe;`)
        expect(run(`export { a as pipe };`)).toBe(undefined)
        expect(run(`export { pipe } from "./pipe";`)).toBe(undefined)
        expect(run(`export * as Duration from "./rect";`)).toBe(undefined)
    })

    it("should replace what is used in enums", () => {
        expect(run(`enum A { pipe = Math.clamp(1, 0, 2), B = Duration.parse(a) }`)).toBe(`import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp.mjs";import { parse as _parse } from "@monstermann/stdlib/Duration/parse.mjs";enum A { pipe = _clamp(1, 0, 2), B = _parse(a) }`)
        expect(run(`enum A { B = pipe(1) }`)).toBe(`import { pipe } from "@monstermann/stdlib/pipe.mjs";enum A { B = pipe(1) }`)
        expect(run(`enum Duration { A }`)).toBe(undefined)
    })

    it("should see through what is put around a global", () => {
        expect(run(`(Math).clamp(a, 0, 1);`)).toBe(`import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp.mjs";_clamp(a, 0, 1);`)
        expect(run(`Math!.clamp(a, 0, 1);`)).toContain(`_clamp(a, 0, 1);`)
        expect(run(`(Math as any).clamp(a, 0, 1);`)).toContain(`_clamp(a, 0, 1);`)
        expect(() => run(`const { clamp } = Math as any;`)).toThrow("Math.clamp")
    })

    it("should find what is written in unusual ways", () => {
        expect(run(`Math /* a */ .clamp(a, 0, 1);`)).toContain(`_clamp /* a */ (a, 0, 1);`.replace(" /* a */ ", ""))
        expect(run(`
            Math
                // a
                .clamp(a, 0, 1);
        `)).toContain(`_clamp(a, 0, 1);`)
        expect(run(`Math. /* a */ clamp(a, 0, 1);`)).toContain(`_clamp(a, 0, 1);`)
        expect(run(`Math?.clamp(a, 0, 1);`)).toContain(`_clamp(a, 0, 1);`)
    })

    it("should reject every way of taking something off a global", () => {
        expect(() => run(`const { clamp, max: { a } } = Math;`)).toThrow("Math.clamp")
        expect(() => run(`const { clamp = () => 0 } = Math;`)).toThrow("Math.clamp")
        expect(() => run(`const { clamp }: Math = Math;`)).toThrow("Math.clamp")
        expect(() => run(`const { ["clamp"]: a } = Math;`)).toThrow("Math.clamp")
        expect(() => run(`let clamp; ({ clamp } = Math);`)).toThrow("Math.clamp")
        expect(() => run(`function a({ clamp } = Math) {}`)).toThrow("Math.clamp")
        expect(() => run(`Math?.["clamp"](a, 0, 1);`)).toThrow("Math.clamp")
        expect(() => run("Math[`clamp`](a, 0, 1);")).toThrow("Math.clamp")
    })

    it("should reject every way of changing what is on a global", () => {
        expect(() => run(`Math.clamp ??= a;`)).toThrow("Math.clamp")
        expect(() => run(`delete Math.clamp;`)).toThrow("Math.clamp")
        expect(() => run(`[Math.clamp] = [a];`)).toThrow("Math.clamp")
        expect(() => run(`({ a: Math.clamp } = b);`)).toThrow("Math.clamp")
        expect(() => run(`Math.clamp++;`)).toThrow("Math.clamp")
        expect(run(`delete Duration.parse;`)).toBe(`import { Duration } from "@monstermann/stdlib/Duration/index.mjs";delete Duration.parse;`)
    })

    it("should keep every line where it is when a guard has no semicolon", () => {
        expect(run(`
            import "@monstermann/stdlib/globals"

            ;(Math.clamp)(a, 0, 1)
            b()
        `)).toBe(dedent(`
            import { clamp as _clamp } from "@monstermann/stdlib/Math/clamp.mjs";

            ;(_clamp)(a, 0, 1)
            b()
        `))
    })

    it("should not replace types", () => {
        expect(run(`
            type Clamp = typeof Math.clamp;
        `)).toBe(undefined)
    })
})
