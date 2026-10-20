import { describe, expect, it } from "bun:test"
import { transform } from "../src"

function run(code: string): string | undefined {
    return transform(dedent(code), "source.ts")?.code
}

function dedent(code: string): string {
    const lines = code.split("\n").filter((line, i, lines) => line.trim() || (i > 0 && i < lines.length - 1))
    const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)![0].length))
    return lines.map((line) => line.slice(indent)).join("\n")
}

describe("transform", () => {
    it("should import the members of namespaces directly", () => {
        expect(run(`
            import { Duration } from "@monstermann/stdlib";
            Duration.SECOND;
            Duration.parse(text);
        `)).toBe(dedent(`
            import { SECOND as _SECOND } from "@monstermann/stdlib/Duration/SECOND.mjs";
            import { parse as _parse } from "@monstermann/stdlib/Duration/parse.mjs";
            _SECOND;
            _parse(text);
        `))
    })

    it("should import what is used of globals directly", () => {
        expect(run(`
            import "@monstermann/stdlib/globals";
            Array.removeAll(a, [1]);
            Function.debounce(b, { wait: 1 });
        `)).toBe(dedent(`
            import { removeAll as _removeAll } from "@monstermann/stdlib/Array/removeAll.mjs";import { debounce as _debounce } from "@monstermann/stdlib/Function/debounce.mjs";
            _removeAll(a, [1]);
            _debounce(b, { wait: 1 });
        `))
        expect(run(`Array.from(a);`)).toBe(undefined)
    })

    it("should work without importing anything", () => {
        expect(run(`
            import "@monstermann/stdlib/globals";
            export const a = pipe(b, b => Array.map(b, v => match(v).case(1, Duration.SECOND).unwrapOr(c)));
            export const d = Ok(match);
        `)).toBe(dedent(`
            import { map as _map } from "@monstermann/stdlib/Array/map.mjs";import { SECOND as _SECOND } from "@monstermann/stdlib/Duration/SECOND.mjs";import { Ok } from "@monstermann/stdlib/Result.mjs";import { match } from "@monstermann/stdlib/match.mjs";
            export const a = _map(b, v => ((v === (1)) ? (_SECOND)
            : (c)));
            export const d = Ok(match);
        `))
    })

    it("should keep every line where it is", () => {
        expect(run(`
            import "@monstermann/stdlib/globals"
            match(a).case(1, 2).unwrapOr(3)
            b()
        `)!.split("\n").at(-1)).toBe("b()")
        expect(run(`
            import { _, match } from "@monstermann/stdlib"
            match(a).shape([_, 1], 2).unwrapOr(3)
            b()
        `)!.split("\n").length).toBe(4)
    })

    it("should replace globals next to everything else", () => {
        expect(run(`
            import { match, pipe, Duration } from "@monstermann/stdlib";
            pipe(a, a => Array.map(a, v => match(v).case(1, Duration.SECOND).unwrapOr(b)));
        `)).toBe(`\n${dedent(`
            import { map as _map } from "@monstermann/stdlib/Array/map.mjs";import { SECOND as _SECOND } from "@monstermann/stdlib/Duration/SECOND.mjs";
            _map(a, v => ((v === (1)) ? (_SECOND)
            : (b)));
        `)}`)
    })

    it("should import everything else from the file it lives in", () => {
        expect(run(`
            import { pipe, match as m, Duration } from "@monstermann/stdlib";
            call(pipe, m, Duration.parse);
        `)).toBe(dedent(`
            import { pipe } from "@monstermann/stdlib/pipe.mjs";
            import { match as m } from "@monstermann/stdlib/match.mjs";
            import { parse as _parse } from "@monstermann/stdlib/Duration/parse.mjs";
            call(pipe, m, _parse);
        `))
    })

    it("should import namespaces that are used as a value from their own file", () => {
        expect(run(`
            import { Duration } from "@monstermann/stdlib";
            call(Duration);
        `)).toBe(dedent(`
            import { Duration } from "@monstermann/stdlib/Duration/index.mjs";
            call(Duration);
        `))
    })

    it("should import the members of the namespaces of @monstermann/stdlib-web directly", () => {
        expect(run(`
            import { DOM, Rect } from "@monstermann/stdlib-web";
            import { Duration } from "@monstermann/stdlib";
            const rect: Rect = Rect.origin;
            DOM.scrollBy(element, { duration: Duration.SECOND });
        `)).toBe(dedent(`
            import { scrollBy as _scrollBy } from "@monstermann/stdlib-web/DOM/scrollBy.mjs";
            import { origin as _origin } from "@monstermann/stdlib-web/Rect/origin.mjs";
            import type { Rect } from "@monstermann/stdlib-web";
            import { SECOND as _SECOND } from "@monstermann/stdlib/Duration/SECOND.mjs";
            const rect: Rect = _origin;
            _scrollBy(element, { duration: _SECOND });
        `))
    })

    it("should import the namespaces of @monstermann/stdlib-web that are used as a value from their own file", () => {
        expect(run(`
            import { Rect, type Placement } from "@monstermann/stdlib-web";
            call(Rect);
        `)).toBe(dedent(`
            import type { Placement } from "@monstermann/stdlib-web";
            import { Rect } from "@monstermann/stdlib-web/Rect/index.mjs";
            call(Rect);
        `))
    })

    it("should keep types", () => {
        expect(run(`
            import { Duration, type Result, pipe } from "@monstermann/stdlib";
            const a: number = Duration.SECOND;
            let b: Result<number, string>;
        `)).toBe(dedent(`
            import type { Result } from "@monstermann/stdlib";
            import { pipe } from "@monstermann/stdlib/pipe.mjs";
            import { SECOND as _SECOND } from "@monstermann/stdlib/Duration/SECOND.mjs";
            const a: number = _SECOND;
            let b: Result<number, string>;
        `))
    })

    it("should compile match expressions and remove the import", () => {
        expect(run(`
            import { match } from "@monstermann/stdlib";
            const a = (value) => match(value).case(1, "one").unwrapOr("other");
        `)).toBe(dedent(`

            const a = (value) => ((value === (1)) ? ("one")
            : ("other"));
        `))
    })

    it("should compile chains inside of the callbacks of other chains", () => {
        expect(run(`
            import { _, match } from "@monstermann/stdlib";
            const a = (value, other, pattern) => match(value).onCase(1, v => match(other).case(v, "same").shape(pattern, [_, v], "alike").unwrap()).unwrapOrElse(() => match(other).case(2, "other").unwrapOr("none"));
        `)).toBe(dedent(`

            import { matches as matches0 } from "@monstermann/stdlib/internals/match/matches.mjs";
            import { throwUnmatched as throwUnmatched0 } from "@monstermann/stdlib/internals/match/throwUnmatched.mjs";
            const a = (value, other, pattern) => ((value === (1)) ? (((other === (value)) ? ("same")
            : (matches0(other, pattern) || (Array.isArray(other) && other.length === 2 && other[1] === (value))) ? ("alike")
            : throwUnmatched0(other)))
            : (((other === (2)) ? ("other")
            : ("none"))));
        `))
    })

    it("should keep the import of a wildcard that is still used", () => {
        expect(run(`
            import { _, match } from "@monstermann/stdlib";
            const a = (value) => match(value).shape([_], "one").unwrapOr(_);
        `)).toBe(dedent(`
            import { _ } from "@monstermann/stdlib/_.mjs";
            const a = (value) => ((Array.isArray(value) && value.length === 1) ? ("one")
            : (_));
        `))
    })

    it("should keep the import of match when it is still used", () => {
        expect(run(`
            import { match } from "@monstermann/stdlib";
            const a = match(value).case(1, "one").unwrapOr("other");
            const b = match;
        `)).toStartWith(`import { match } from "@monstermann/stdlib/match.mjs";`)
    })

    it("should leave unknown exports, other packages and namespace imports alone", () => {
        expect(run(`
            import { unknown } from "@monstermann/stdlib";
            import { Duration } from "other";
            import * as Fn from "@monstermann/stdlib";
            Duration.parse();
            Fn.Duration.parse();
        `)).toBe(undefined)
        expect(run(`import { Duration } from "@monstermann/stdlibord";\nDuration.parse();`)).toBe(undefined)
        expect(run(`const a = 1`)).toBe(undefined)
    })

    it("should create sourcemaps", () => {
        const result = transform(`import { match, Duration, pipe } from "@monstermann/stdlib";\nmatch(a).case(1, Duration.parse(b)).unwrapOr(pipe(Array.map(c, d)));`, "source.ts")
        expect(result!.map.sources).toEqual(["source.ts"])
        expect(result!.map.mappings).toBeTruthy()
        expect(result!.map.sourcesContent![0]).toContain(`match(a).case(1`)
    })
})
