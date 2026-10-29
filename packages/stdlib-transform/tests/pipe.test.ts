import { describe, expect, it } from "bun:test"
import { transformPipes } from "../src/pipe"

const from = "@monstermann/stdlib"

function run(code: string): string {
    for (let pipes = transformPipes(code, "source.ts", from); pipes.ms.hasChanged(); pipes = transformPipes(code, "source.ts", from)) code = pipes.ms.toString()
    return code
}

/** What a call returns as it is written, and what it returns once it has been replaced. */
function both(code: string, scope: Record<string, unknown> = {}): [unknown, unknown] {
    const pipe = (value: unknown, ...fns: ((value: unknown) => unknown)[]): unknown => fns.reduce((value, fn) => fn(value), value)
    const evaluate = (code: string): unknown => new Function("pipe", ...Object.keys(scope), `return ${code}`)(pipe, ...Object.values(scope))
    const compiled = run(`const result = ${code}`).slice("const result = ".length)
    expect(compiled).not.toContain("pipe(")
    return [evaluate(compiled), evaluate(code)]
}

describe("transformPipes", () => {
    it("should replace a call with the calls it makes", () => {
        expect(run(`pipe(a, f, g)`)).toBe(`g(f(a))`)
        expect(run(`const b = pipe(a)`)).toBe(`const b = a`)
        expect(run(`const b = pipe(a + 1)`)).toBe(`const b = (a + 1)`)
        expect(run(`pipe(a, o.f, o.g.h)`)).toBe(`;(0, o.g.h)((0, o.f)(a))`)
    })

    it("should replace callbacks with what they return", () => {
        expect(run(`const a = pipe(tasks, tasks => removeAll(tasks, done), tasks => tasks.length, format)`)).toBe(`const a = format(removeAll(tasks, done).length)`)
        expect(run(`const a = pipe(o.rect, rect => align(rect, o.anchor), rect => clamp(rect, boundary))`)).toBe(`const a = clamp(align(o.rect, o.anchor), boundary)`)
        expect(run(`const a = pipe(b, (v: number): number => v + 1, v => { return v * 2 })`)).toBe(`const a = ((b + 1) * 2)`)
        expect(run(`const a = pipe(b, v => ({ v }), v => [v], v => \`\${v}\`)`)).toBe("const a = `${[({ v: b })]}`")
    })

    it("should use a value any number of times when it always is the same", () => {
        expect(run(`const a = 1; const b = pipe(a, v => v + v)`)).toBe(`const a = 1; const b = (a + a)`)
        expect(run(`function f(a) { return pipe(a, v => [v, () => v]) }`)).toBe(`function f(a) { return [a, () => a] }`)
        expect(run(`const b = pipe("a", v => v + v)`)).toBe(`const b = ("a" + "a")`)
        expect(run(`const b = pipe(1, v => v.toFixed())`)).toBe(`const b = (1).toFixed()`)
        // Assigned to somewhere, a global, something that has been imported.
        expect(run(`let a = 1; a++; const b = pipe(a, v => v + v)`)).toBe(`let a = 1; a++; const b = (v => v + v)(a)`)
        expect(run(`const b = pipe(a, v => v + v)`)).toBe(`const b = (v => v + v)(a)`)
        expect(run(`import { a } from "./a"; const b = pipe(a, v => v + v)`)).toBe(`import { a } from "./a"; const b = (v => v + v)(a)`)
    })

    it("should call a callback as it is when its parameter is not the first thing that happens", () => {
        expect(run(`const a = pipe(b(), v => f(g(), v))`)).toBe(`const a = (v => f(g(), v))(b())`)
        expect(run(`const a = pipe(b(), v => c || v)`)).toBe(`const a = (v => c || v)(b())`)
        expect(run(`const a = pipe(b(), v => c ? v : d)`)).toBe(`const a = (v => c ? v : d)(b())`)
        expect(run(`const a = pipe(b(), v => o?.f(v))`)).toBe(`const a = (v => o?.f(v))(b())`)
        expect(run(`const a = pipe(b(), v => () => v)`)).toBe(`const a = (v => () => v)(b())`)
        expect(run(`const a = pipe(b(), v => (v = 1))`)).toBe(`const a = (v => (v = 1))(b())`)
        expect(run(`const a = pipe(b(), () => 1)`)).toBe(`const a = (() => 1)(b())`)
        expect(run(`const a = pipe(b(), ({ c }) => c)`)).toBe(`const a = (({ c }) => c)(b())`)
        expect(run(`const a = pipe(b(), v => { c(); return v })`)).toBe(`const a = (v => { c(); return v })(b())`)
        // What only reads names and properties before it is fine.
        expect(run(`const a = pipe(b(), v => f(c, d.e, v), v => v ?? d, v => v ? 1 : 2)`)).toBe(`const a = ((f(c, d.e, b()) ?? d) ? 1 : 2)`)
    })

    it("should call functions as they are", () => {
        expect(run(`const a = pipe(b, async v => v, function (v) { return this })`)).toBe(`const a = (function (v) { return this })((async v => v)(b))`)
    })

    it("should not turn a function into a method or the other way around", () => {
        expect(run(`const a = pipe(o.f, f => f(1))`)).toBe(`const a = (0, o.f)(1)`)
        expect(run(`const a = pipe(o.f(), F => new F())`)).toBe(`const a = (new (o.f())())`)
        expect(run(`const a = pipe(o.f(), v => new v.F())`)).toBe(`const a = (new (o.f()).F())`)
    })

    it("should keep calls whose steps have to be created", () => {
        expect(run(`pipe(a, create())`)).toBe(`pipe(a, create())`)
        expect(run(`pipe(a, b ? c : d)`)).toBe(`pipe(a, b ? c : d)`)
        expect(run(`pipe(a, o[f])`)).toBe(`pipe(a, o[f])`)
        expect(run(`pipe(a, ...fns)`)).toBe(`pipe(a, ...fns)`)
        expect(run(`pipe()`)).toBe(`pipe()`)
        expect(run(`pipe?.(a, f)`)).toBe(`pipe?.(a, f)`)
    })

    it("should leave what is called the same alone", () => {
        expect(run(`function f(pipe) { return pipe(a, b) }`)).toBe(`function f(pipe) { return pipe(a, b) }`)
        expect(run(`import { pipe } from "./pipe"; pipe(a, b)`)).toBe(`import { pipe } from "./pipe"; pipe(a, b)`)
        expect(run(`o.pipe(a, b)`)).toBe(`o.pipe(a, b)`)
        expect(run(`import { pipe as p } from "${from}"; const a = p(b, c); pipe(b, c)`)).toBe(`import { pipe as p } from "${from}"; const a = c(b); pipe(b, c)`)
    })

    it("should replace calls inside of other calls", () => {
        expect(run(`const a = pipe(b, v => pipe(v, w => w + 1, w => w * 2), v => [v])`)).toBe(`const a = [((b + 1) * 2)]`)
        expect(run(`const a = pipe(pipe(b, c), d)`)).toBe(`const a = d(c(b))`)
    })

    it("should not become a part of the statement before", () => {
        expect(run(`a\npipe(b, v => [v])`)).toBe(`a\n;[b]`)
        expect(run(`a\npipe(b, v => v + 1)`)).toBe(`a\n;(b + 1)`)
        expect(run(`a\npipe(b, c)`)).toBe(`a\nc(b)`)
        expect(run(`if (a) pipe(b, v => [v])`)).toBe(`if (a) [b]`)
    })

    it("should tell how often pipe is still used", () => {
        expect(transformPipes(`import { pipe } from "${from}"; pipe(a, b)`, "source.ts", from)).toMatchObject({ imports: 1, references: 0 })
        expect(transformPipes(`import { pipe } from "${from}"; pipe(a, b); call(pipe)`, "source.ts", from)).toMatchObject({ imports: 1, references: 1 })
        expect(transformPipes(`pipe(a, v => pipe(v, b))`, "source.ts", from)).toMatchObject({ imports: 0, references: 1 })
        expect(transformPipes(`pipe(a, create())`, "source.ts", from)).toMatchObject({ imports: 0, references: 1 })
    })

    it("should return the same as the call it replaces", () => {
        const scope = {
            list: [1, 2, 3],
            double: (n: number) => n * 2,
            o: { n: 2, f(this: unknown) {
                return this === undefined ? "function" : "method"
            } },
        }
        const cases = [
            `pipe(list, xs => xs.map(x => x * 2), xs => xs.filter(x => x > 2), xs => xs.length)`,
            `pipe(o.n, double, n => n + n, n => [n, n], ([a, b]) => a + b)`,
            `pipe(3, n => n.toFixed(2), s => s + s, s => \`\${s}!\`, s => ({ s }), o => o.s)`,
            `pipe(o.f, f => f())`,
            `pipe(o, v => v.f())`,
            `pipe(list, xs => pipe(xs, ys => ys[0], double), n => n || 5, n => n ? "a" : "b")`,
            `pipe(o.n, n => -n, n => typeof n, s => s.length, n => double(n))`,
            `pipe(null, v => v ?? list, v => v?.length, function (n) { return n + 1 })`,
        ]
        for (const code of cases) {
            const [compiled, expected] = both(code, scope)
            expect(compiled).toEqual(expected)
        }
    })

    it("should evaluate everything in the same order", () => {
        for (const code of [
            `pipe(log("a"), v => [log("b"), v], v => log(v.join("")))`,
            `pipe(log("a"), v => v + log("b"), v => log("c") + v)`,
            `pipe(log("a"), v => log("b") || v, v => cond ? v : log("c"))`,
            `pipe(log("a"), v => o.m(log("b"), v), v => o?.m(v, log("c")))`,
            `pipe(log("a"), v => ({ [log("k")]: v, b: log("b") }), v => Object.keys(v).join())`,
        ]) {
            const logs: [string[], string[]] = [[], []]
            const scope = (to: string[]): Record<string, unknown> => ({
                cond: true,
                o: { m: (...values: string[]) => values.join("") },
                log: (value: string) => {
                    to.push(value)
                    return value
                },
            })
            const compiled = run(`const result = ${code}`).slice("const result = ".length)
            const evaluate = (code: string, scope: Record<string, unknown>): unknown => new Function("pipe", ...Object.keys(scope), `return ${code}`)((value: unknown, ...fns: ((value: unknown) => unknown)[]) => fns.reduce((value, fn) => fn(value), value), ...Object.values(scope))
            expect(evaluate(compiled, scope(logs[0]))).toEqual(evaluate(code, scope(logs[1])))
            expect(logs[0]).toEqual(logs[1])
        }
    })
})
