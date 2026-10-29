import { describe, expect, it } from "bun:test"
import { transformMessages } from "../src/i18n"

function run(code: string): string | undefined {
    return transformMessages(dedent(code), "source.ts")?.toString()
}

function dedent(code: string): string {
    const lines = code.split("\n").filter((line, i, lines) => line.trim() || (i > 0 && i < lines.length - 1))
    const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)![0].length))
    return lines.map((line) => line.slice(indent)).join("\n")
}

describe("transformMessages", () => {
    it("should import messages from the messages of the folder", () => {
        expect(run(`
            import { m } from "#app/i18n";
            t(m.auth.signIn);
            t(m.hello, { name });
            m.auth.signIn({ lang: "de" });
        `)).toBe(dedent(`
            import { _authSignIn, _hello } from "#app/i18n/_messages";
            t(_authSignIn);
            t(_hello, { name });
            _authSignIn({ lang: "de" });
        `))
    })

    it("should find the messages next to an index", () => {
        expect(run(`import { m } from "./i18n/index.ts"; m.a;`)).toBe(`import { _a } from "./i18n/_messages.ts"; _a;`)
        expect(run(`import { m } from "../i18n/"; m.a;`)).toBe(`import { _a } from "../i18n/_messages"; _a;`)
    })

    it("should throw where m is used otherwise, which would bundle every message", () => {
        expect(() => run(`
            import { m } from "./i18n"
            t(m.a)
            t(m[key])
        `)).toThrow("source.ts:3: m can only be used as m.auth.signIn")
        expect(() => run(`import { m } from "./i18n"; const { a } = m;`)).toThrow()
        expect(() => run(`import { m } from "./i18n"; m.a = b;`)).toThrow()
        // Types are not bundled.
        expect(run(`import { m } from "./i18n"; type A = typeof m; m.a;`)).toBe(`import { _a } from "./i18n/_messages"; type A = typeof m; _a;`)
    })

    it("should keep the other imports of the line", () => {
        expect(run(`
            import { langs, m, type Lang } from "./i18n";
            t(m.a);
        `)).toBe(dedent(`
            import { langs, type Lang } from "./i18n"; import { _a } from "./i18n/_messages";
            t(_a);
        `))
    })

    it("should name imports apart from what the file declares", () => {
        expect(run(`
            import { m as messages } from "./i18n";
            const _a = 1;
            t(messages.a);
        `)).toBe(dedent(`
            import { _a as _a1 } from "./i18n/_messages";
            const _a = 1;
            t(_a1);
        `))
    })

    it("should leave alone what is not the imported m", () => {
        expect(run(`
            import { m } from "./i18n";
            function f(m) { return m.a }
        `)).toBeUndefined()
        expect(run(`import { m } from "./paraglide/messages.js"; m.hello();`)).toBeUndefined()
        expect(run(`import type { m } from "./i18n"; type A = typeof m.a;`)).toBeUndefined()
        expect(run(`const m = {}; m.a;`)).toBeUndefined()
    })
})
