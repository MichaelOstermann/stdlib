import { describe, expect, it } from "bun:test"
import { _ } from "../../stdlib/src/_"
import { matches } from "../../stdlib/src/internals/match/matches"
import { throwUnmatched } from "../../stdlib/src/internals/match/throwUnmatched"
import { match } from "../../stdlib/src/match"
import { transformMatches } from "../src/match"

const from = "@monstermann/stdlib"
const helpers = ["matches0", "throwUnmatched0"]

function compile(body: string, imports = `import { _, match } from "${from}";`): { code: string, imports: string, unused: string[] } {
    const result = transformMatches(`${imports}\n${body}`, "source.ts", from)!
    const code = result.ms.toString()
    const head = /^(?:import .*\n)+/.exec(code)![0]
    return { code: code.slice(head.length), imports: head, unused: result.unused }
}

/** Runs a function body as it is, and compiled. */
function run(body: string): { compiled: unknown, original: unknown, unused: string[] } {
    const { code, unused } = compile(body)
    const evaluate = (source: string): unknown => new Function("match", "_", ...helpers, `"use strict";${source}`)(match, _, matches, throwUnmatched)
    return { compiled: evaluate(code), original: evaluate(body), unused }
}

/** Runs a chain with each of the values, as it is, and compiled, to see that both agree. */
function agree(chain: string, values: string, setup = ""): { code: string, unused: string[] } {
    const body = `${setup}; return (${values}).map(value => { try { return ${chain} } catch (error) { return error.message } });`
    const { compiled, original } = run(body)
    expect(compiled).toEqual(original)
    return compile(body)
}

describe("transformMatches", () => {
    // Everything that compiles into comparisons and nothing else.
    const free: [name: string, chain: string, values: string, setup?: string][] = [
        ["values", `match(value).case(1, "one").case(2, 3, "few").unwrapOr("many")`, `[1, 2, 3, 4]`],
        ["values that are expressions", `match(value).case(-1, "minus").case(\`a\${1}\`, "template").case(undefined, null, "nothing").unwrapOr("other")`, `[-1, "a1", undefined, null, 0]`],
        ["values that are names", `match(value).case(ONE, Kind.two, "few").case(create(), "created").case(object, "same").unwrapOr("other")`, `[1, 2, 3, object, { a: 1 }, NaN]`, `const ONE = 1, Kind = { two: 2 }, object = { a: 1 }; let created = NaN; const create = () => created`],
        ["shapes", `match(value).shape({ type: "a" }, "A").shape({ type: "b", id: 1 }, "B1").unwrapOr("other")`, `[{ type: "a" }, { id: 1, type: "b" }, { id: 2, type: "b" }]`],
        ["shapes with fields that are names", `match(value).shape({ type: Kind.a, id: ONE }, "yes").shape({ type: other }, "other").unwrapOr("no")`, `[{ type: "a", id: 1 }, { type: "a", id: 2 }, { type: NaN }, { type: _ }]`, `const ONE = 1, Kind = { a: "a" }; let other = NaN`],
        ["shapes and everything that is no object", `match(value).shape({ type: undefined }, "none").shape({ length: 1 }, "one").unwrapOr("other")`, `[null, undefined, 0, "a", "ab", [1], {}, { type: "a" }]`],
        ["shapes with computed and quoted keys", `match(value).shape({ "a-b": 1, ["c"]: 2, 3: 4 }, "yes").unwrapOr("no")`, `[{ "a-b": 1, c: 2, 3: 4 }, { "a-b": 1, c: 2 }]`],
        ["empty shapes", `match(value).shape({}, "something").unwrapOr("nothing")`, `[null, undefined, 0, "", {}]`],
        ["tuples", `match(value).shape([1, 2], "a").shape([1, _], "b").shape([match._, _], "c").unwrapOr("d")`, `[[1, 2], [1, 3], [2, 2], [1], [1, 2, 3], null, "ab", { 0: 1, 1: 2, length: 2 }]`],
        ["tuples with positions that are names", `match(value).shape([ONE, Kind.a], "a").shape([other, _], "b").unwrapOr("c")`, `[[1, "a"], [2, "a"], [NaN, 1], [_, 1]]`, `const ONE = 1, Kind = { a: "a" }; let other = NaN`],
        ["empty tuples", `match(value).shape([], "empty").unwrapOr("other")`, `[[], [1], null]`],
        ["tuples of what is being passed", `match([value, value + 1]).shape([1, 2], "a").shape([2, _], "b").shape([1], "never").case(value, "never").unwrapOr("c")`, `[1, 2, 3]`],
        ["callbacks", `match(value).onCase(1, v => v + 1).onShape({ id: 2 }, v => v.id * 10).unwrapOrElse(v => String(v))`, `[1, { id: 2 }, "a"]`],
        ["callbacks of tuples", `match([value, 2]).onShape([1, _], () => "one").onShape([2, _], ([a, b]) => a + b).unwrapOrElse(v => v.length)`, `[1, 2, 3]`],
        ["predicates", `match(value).cond(v => v > 10, "big").onCond(v => v > 5, v => v * 2).unwrapOr("small")`, `[20, 7, 1]`],
        ["predicates of tuples", `match([value, 1]).cond(([a, b]) => a === b, "same").cond(() => value > 5, "big").unwrapOr("other")`, `[1, 7, 2]`],
        ["results that are expressions", `match(value).case(1, { a: 1 }).case(2, [value]).case(3, value > 2 ? "a" : "b").unwrapOr(\`\${value}\`)`, `[1, 2, 3, 4]`],
        ["returnType", `match(value).returnType().case(1, "one").unwrapOr("other")`, `[1, 2]`],
    ]

    for (const [name, chain, values, setup] of free) {
        it(`should compile ${name}`, () => {
            const { code, unused } = agree(chain, values, setup)
            expect(unused).toContain("match")
            expect(code).not.toContain("matches0")
            expect(code).not.toContain("match(")
        })
    }

    it("should compile into what is expected", () => {
        const code = (chain: string): string => compile(`const value = 0;\nx = ${chain};`).code.split("\n").slice(1).join("\n")
        expect(code(`match(value).case(1, Status.Active, "a").unwrapOr("b")`)).toBe(`x = (((value === (1)) || (value === (Status.Active))) ? ("a")\n: ("b"));`)
        expect(code(`match(value).shape({ type: "a", id: Id.one }, "a").unwrapOr("b")`)).toBe(`x = ((typeof value === "object" && value !== null && value.type === ("a") && value.id === (Id.one)) ? ("a")\n: ("b"));`)
        expect(code(`match(value).shape(["a", _, Kind.b, match._], "a").unwrapOr("b")`)).toBe(`x = ((Array.isArray(value) && value.length === 4 && value[0] === ("a") && value[2] === (Kind.b)) ? ("a")\n: ("b"));`)
        expect(code(`match([value, other]).shape(["a", _], "a").shape([_, _], "b").unwrap()`)).toBe(`x = ((match0) => (value === ("a")) ? ("a")\n: true ? ("b")\n: throwUnmatched0([value, match0]))(other);`)
    })

    // Shapes that can only be looked at once the code runs.
    const checked: [name: string, chain: string, values: string, setup: string, expected: string][] = [
        ["shapes that are a name", `match(value).shape(pattern, "yes").unwrapOr("no")`, `[1, { a: 1, b: 2 }, { a: 2 }, [1]]`, `const pattern = arguments.length ? 1 : { a: 1 }`, "matches0(value, pattern)"],
        ["shapes that are a name of something else", `match(value).shape(pattern, "yes").unwrapOr("no")`, `[1, { a: 1 }, [1, 2], [1, 3]]`, `const pattern = [1, _]`, "matches0(value, pattern)"],
        ["shapes that are calls", `match(value).shape(create(), "yes").unwrapOr("no")`, `[{ a: 1 }, { a: 2 }]`, `const create = () => ({ a: 1 })`, "matches0(value, create())"],
        ["shapes that are spread", `match(value).shape({ ...shape, b: 2 }, "yes").unwrapOr("no")`, `[{ a: 1, b: 2 }, { a: 1 }]`, `const shape = { a: 1 }`, "matches0(value, { ...shape, b: 2 })"],
        ["tuples that are spread", `match(value).shape([...list, _], "yes").unwrapOr("no")`, `[[1, 2], [2, 2]]`, `const list = [1]`, "matches0(value, [...list, _])"],
        ["shapes against tuples of what is being passed", `match([value, 2]).shape({ 0: 1 }, "yes").unwrapOr("no")`, `[1, 2]`, ``, "matches0([value, match0], { 0: 1 })"],
        ["shapes that are no shapes", `match(value).shape(1, "yes").shape("a", "yes").unwrapOr("no")`, `[1, "a"]`, ``, "matches0(value, 1)"],
    ]

    for (const [name, chain, values, setup, expected] of checked) {
        it(`should compile ${name}`, () => {
            expect(agree(chain, values, setup).code).toContain(expected)
        })
    }

    it("should only take what has been imported for a wildcard", () => {
        // Something else of the same name.
        const shadowed = `function f(_) { return match([1, 2]).shape([1, _], "yes").unwrapOr("no") } return [f(2), f(5), f(undefined)];`
        expect(run(shadowed).compiled).toEqual(run(shadowed).original)
        expect(compile(shadowed).code).toContain(`match1 === (_)`)

        // Another name it has been imported as.
        const renamed = compile(`const v = 0;\nx = m(v).shape([1, any, m._], 2).unwrapOr(3);`, `import { _ as any, match as m } from "${from}";`)
        expect(renamed.code).toContain(`(Array.isArray(v) && v.length === 3 && v[0] === (1)) ? (2)`)
        expect(renamed.unused).toEqual(["match", "_"])

        // Another name it has been given, which the types do not allow.
        const named = compile(`const v = 0, w = _;\nx = match(v).shape([1, w], 2).unwrapOr(3);`)
        expect(named.code).toContain(`v[0] === (1) && v[1] === (w)) ? (2)`)
        expect(named.unused).toEqual(["match"])
    })

    it("should tell what is not referred to any more", () => {
        expect(compile(`match(a).shape([1, match._], 2).unwrapOr(3);`).unused).toEqual(["match", "_"])
        expect(compile(`match(a).shape([1, _], 2).unwrapOr(3);`).unused).toEqual(["match", "_"])
        expect(compile(`match(a).shape([1, _], 2).unwrapOr(3); call(_);`).unused).toEqual(["match"])
        // Imported, and not referred to to begin with.
        expect(compile(`match(a).case(1, 2).unwrapOr(3); call(match._);`).unused).toEqual(["_"])
        expect(compile(`match(a).case(1, 2).unwrapOr(3); call({ _ });`).unused).toEqual(["match"])
        expect(compile(`match(a).case(1, 2).unwrapOr(3); call({ _: 1 }, b._);`).unused).toEqual(["match", "_"])
        expect(compile(`match(a).onCase(1, () => match(b).shape([_], 3).unwrapOr(4)).unwrapOr(5);`).unused).toEqual([])
        expect(compile(`match(a).shape([...b, _], 2).unwrapOr(3);`).unused).toEqual(["match"])
        expect(compile(`match(a).case(1, 2).unwrapOr(...b);`).unused).toEqual([])
        // Imported several times, where dropping the import by its name would drop the others.
        const twice = compile(`const a = 1;\nmatch(a).case(1, 2).unwrapOr(3);\nother(a).case(1, 2).unwrapOr(3);`, `import { match, match as other } from "${from}";`)
        expect(twice.code).toContain(`((a === (1)) ? (2)`)
        expect(twice.code).toContain(`other(a).case(1, 2).unwrapOr(3);`)
        expect(twice.unused).toEqual([])
        expect(compile(`const a = 1;\nmatch(a).case(1, 2).unwrapOr(3);`, `import { match } from "${from}";\nimport { match as other } from "${from}";`).unused).toEqual([])
    })

    it("should throw for what has not been matched", () => {
        expect(agree(`match(value).case(1, "one").unwrap()`, `[1, 2, "a", null, undefined, { a: 1 }, { a: 1n }]`).code).toContain(`(value === (1)) ? ("one")\n: throwUnmatched0(value))`)
        expect(agree(`match([value, "a"]).shape([1, "a"], "one").unwrap()`, `[1, 2]`).code).toContain(`: throwUnmatched0([value, match0]))`)
    })

    it("should import what compiled code refers to", () => {
        const imports = `import { _, match } from "${from}";`
        expect(compile(`match(a).case(1, 2).unwrapOr(3);`).imports).toBe(`${imports}\n`)
        expect(compile(`match(a).shape(b, 2).unwrap();\nmatch(a).shape(b, 2).unwrap();`).imports).toBe([
            imports,
            `import { matches as matches0 } from "${from}/internals/match/matches.mjs";`,
            `import { throwUnmatched as throwUnmatched0 } from "${from}/internals/match/throwUnmatched.mjs";`,
            ``,
        ].join("\n"))
        // Names that are taken, and what a chain that is kept as it is asked for.
        expect(compile(`const matches0 = 1;\nmatch(a).shape(b, 2).unwrapOr(3);\nmatch(a).shape(b, 2).unwrapOr(...c);`).imports).toBe([
            imports,
            `import { matches as matches1 } from "${from}/internals/match/matches.mjs";`,
            ``,
        ].join("\n"))
        expect(compile(`match(a).shape(b, 2).unwrapOr(...c);`).imports).toBe(`${imports}\n`)
        // What has been imported by a run before.
        const again = transformMatches(`${imports}\nmatch(a).shape(b, 2).unwrap();`, "source.ts", from, { matches: "known" })!.ms.toString()
        expect(again).toContain(`known(match0, b)`)
        expect(again).not.toContain(`matches.mjs`)
        expect(again).toContain(`throwUnmatched.mjs`)
    })

    it("should use results as they are, and call the ones that are asked to be called", () => {
        // Whatever a result is, it never has to be looked at.
        const setup = `let result = v => v * 2; const results = { one() { return [this, arguments.length] } }`
        expect(agree(`typeof match(value).case(1, result).cond(v => v > 2, results.one).unwrapOr(result)`, `[1, 2, 3]`, setup).code)
            .toContain(`(value === (1)) ? (result)\n: (value > 2) ? (results.one)\n: (result))`)
        expect(agree(`match(value).onCase(1, result).onCond(v => v > 2, results.one).unwrapOrElse(result)`, `[1, 2, 3]`, setup).code)
            .toContain(`(value === (1)) ? ((result)(value))\n: (value > 2) ? ((0, results.one)(value))\n: ((result)(value)))`)
        expect(agree(`match(value).onCase(1, v => v + 1).unwrapOrElse(v => v * 2)`, `[1, 2]`).code)
            .toContain(`(value === (1)) ? (value + 1)\n: (value * 2))`)
        expect(agree(`match([value, 1]).onShape([1, 1], result).unwrapOrElse(([a, b]) => a + b)`, `[1, 2]`, `let result = v => v.length`).code)
            .toContain(`? ((result)([value, match0]))\n: ((([a, b]) => a + b)([value, match0])))`)
        // Methods are called without the object they belong to, also as callbacks of tuples.
        expect(agree(`match([value, 1]).onShape([1, 1], results.one).unwrapOr(0)`, `[1, 2]`, setup).code).toContain(`? ((0, results.one)([value, match0]))`)

        const { compiled } = run(`const fn = v => v * 2; return [match(2).case(2, fn).unwrapOr(0), match(3).case(2, 0).unwrapOr(fn), fn];`)
        expect(new Set(compiled as unknown[]).size).toBe(1)
    })

    it("should only refer to values as they are when nothing can change them", () => {
        const stable = [
            `const a = 1;\nx = match(a).case(1, 2).unwrapOr(3);`,
            `let a = 1;\nx = match(a).case(1, 2).unwrapOr(3);`,
            `function f(a) {\nreturn match(a).case(1, 2).unwrapOr(3);\n}`,
        ]
        // Assigned to somewhere, a global, something that has been imported.
        const bound = [
            `let a = 1;\nx = match(a).case(1, 2).unwrapOr(3);\na++`,
            `let a = 1;\nx = match(a).case(1, 2).unwrapOr(3);\n[{ b: a }] = c`,
            `x = match(a).case(1, 2).unwrapOr(3);`,
            `import { a } from "a";\nx = match(a).case(1, 2).unwrapOr(3);`,
        ]
        for (const code of stable) expect(compile(code).code).toContain(`((a === (1)) ? (2)`)
        for (const code of bound) expect(compile(code).code).toContain(`((match0) => (match0 === (1)) ? (2)\n: (3))(a)`)
    })

    // Function bodies that are run as they are, and compiled, to see that both agree.
    const bodies: [name: string, body: string][] = [
        ["chains inside of other expressions", `const value = 1; return match(value).case(1, 2).unwrapOr(3) + 4;`],
        ["shapes inside of other expressions", `const value = { a: 1 }; return match(value).shape({ a: 1 }, 2).unwrapOr(3) + 4;`],
        ["callbacks returning the parameter as a shorthand property", `const value = 1; return match(value).onCase(1, v => ({ v })).unwrapOr(null);`],
        ["callbacks using the parameter as a property name", `const value = "a"; return match(value).onCase("a", v => ({ v: 1, w: { v }.v, x: [v].length, y: ({ value: 2 }).value })).unwrapOr(null);`],
        ["callbacks assigning to the parameter", `const value = 1; return match(value).onCase(1, v => ++v).unwrapOr(0);`],
        ["callbacks reassigning the parameter", `const value = 1; return match(value).onCase(1, v => (v = v + 5, v)).unwrapOr(0);`],
        ["callbacks destructuring into the parameter", `const value = 1; return match(value).onCase(1, v => ([v] = [7], v)).unwrapOr(0);`],
        ["callbacks with something inside that has the name of the value", `const value = 1; return match(value).onCase(1, v => ((value) => v)(9)).unwrapOr(0);`],
        ["callbacks shadowing the parameter", `const value = 1; return match(value).onCase(1, v => [v, (v => v + 1)(10)]).unwrapOr(0);`],
        ["callbacks with more parameters", `const value = 1; return match(value).onCase(1, (v, w) => [v, w]).unwrapOr(0);`],
        ["callbacks with a default", `const value = 1; return match(value).unwrapOrElse((v = 5) => v);`],
        ["callbacks that are functions", `const value = 1; return match(value).onCase(1, function (v) { return [v, arguments.length, this === undefined]; }).unwrapOr(0);`],
        ["callbacks without parameters", `const value = 1; return [match(value).onCase(1, () => 2).unwrapOr(0), match(value).onCase(1, () => {}).unwrapOr(0), match(value).onCase(1, () => { return }).unwrapOr(0), match(value).onCase(1, () => { return 3 }).unwrapOr(0)];`],
        ["callbacks with several statements", `const value = 2; return match(value).onCase(2, (v) => { const w = v * 2; return w + 1 }).unwrapOr(0);`],
        ["conditions returning from a block", `const value = 7; return match(value).cond((v) => { return v > 5 }, "big").unwrapOr("small");`],
        ["something else that is called match", `function run(match) { const value = 1; return match(value).case(1, 2).unwrapOr(3); } return run(() => ({ case: () => ({ unwrapOr: () => 99 }) }));`],
        ["something else that is called match, declared later", `function run() { return match(1).case(1, 2).unwrapOr(3); function match() { return { case: () => ({ unwrapOr: () => 99 }) } } } return run();`],
        ["a chain that assigns to the value", `let value = 1; return match(value).onCond(v => { value = 2; return false; }, () => 0).case(1, 3).unwrapOr(4);`],
        ["a chain that updates the value", `let value = 1; return match(value).cond(() => value++ > 5, 0).case(1, 3).unwrapOr(4);`],
        ["empty shapes", `const value = { type: "a" }; return match(value).shape({}, 1).unwrapOr(2);`],
        ["shapes with expressions as values", `const value = { type: "a" }; const flag = false; return match(value).shape({ type: flag ? "a" : "b" }, 1).unwrapOr(2);`],
        ["shapes with computed and quoted keys", `const value = { "a-b": 1, c: 2 }; const key = "c"; return match(value).shape({ "a-b": 1, [key]: 2 }, "yes").unwrapOr("no");`],
        ["callbacks that are methods", `const value = 1; const object = { method() { return [this === undefined, arguments.length] } }; return match(value).onCase(1, object.method).unwrapOr(0);`],
        ["chains that an if is followed by", `let hits = 0; const no = false; if (no) match(1).onCase(1, () => hits++).unwrapOr(0)
            if (no) hits += 10; else match(1).onCase(1, () => hits++).unwrapOr(0)
            for (let i = 0; i < 3; i++) match(1).onCase(1, () => hits += 100).unwrapOr(0)
            return hits`],
        ["chains that start a statement after one without a semicolon", `const f = () => 7; const b = () => { throw new Error("called") }; let x = { y: 0 }
            const a = b
            match(1).case(1, f).unwrapOr(f)()
            const c = b
            match(1).case(1, x).unwrapOr(x).y = 5
            return [typeof a, typeof c, x.y]`],
        ["values that a predicate changes", `let value = 1; const bump = () => { value = 2; return false }; return match(value).cond(bump, 0).case(1, 3).unwrapOr(4);`],
        ["values that a pattern changes", `let value = 1; const bump = () => { value = 2; return 0 }; return match(value).case(bump(), 0).case(1, 3).unwrapOr(4);`],
        ["values of a tuple that a later one changes", `let x = 1; const bump = () => { x = 2; return 5 }; return match([x, bump()]).shape([1, 5], "a").unwrapOr("b");`],
        ["values that change after a callback returned a function", `let value = 1; const f = match(value).onCase(1, v => () => v).unwrapOr(null); value = 2; return f();`],
        ["values that a loop counts up", `const fs = []; for (var value = 0; value < 3; value++) fs.push(match(value).unwrapOrElse(v => () => v)); return fs.map(f => f());`],
        ["values that a loop inside of the chain assigns to", `let value = 1; return match(value).cond(() => { for (value of [2, 3]); return false }, 0).case(1, "one").unwrapOr("other");`],
        ["shapes that set a prototype", `const value = { a: 1 }; return [match(value).shape({ __proto__: null, a: 1 }, "yes").unwrapOr("no"), match(value).shape({ "__proto__": null, a: 1 }, "yes").unwrapOr("no"), match(value).shape({ ["__proto__"]: null }, "yes").unwrapOr("no")];`],
        ["shapes with a key that is there several times", `const value = { a: 2 }; return [match(value).shape({ a: 1, ["a"]: 2 }, "yes").unwrapOr("no"), match(value).shape({ a: 1, a: 2 }, "yes").unwrapOr("no"), match(value).shape({ a: 2, "a": 1 }, "yes").unwrapOr("no")];`],
        ["callbacks that are methods of something that may not be there", `const value = 1; const object = { method() { return this === undefined } }; return [match(value).onCase(1, object?.method).unwrapOr(0), match(value).onCond(object?.method, object?.method).unwrapOr(0), match(2).unwrapOrElse(object?.method), match([1, 2]).onShape([1, 2], object?.method).unwrapOr(0)];`],
        ["fallbacks that are methods", `const value = 1; const o = { m() { return this === undefined }, p: 1 }; const called = match(value).unwrapOr(o.m)(); delete match(value).unwrapOr(o.p); return [called, o.p];`],
        ["callbacks with something hoisted that has the name of the parameter", `const value = 1; return [match(value).onCase(1, v => (() => { const r = typeof v; var v = 3; return r })()).unwrapOr(0), match(value).onCase(1, v => (() => { return typeof v; function v() {} })()).unwrapOr(0)];`],
        ["callbacks with something hoisted that has the name of the value", `const value = 1; return match(value).onCase(1, v => (() => { const r = v; var value = 5; return r })()).unwrapOr(0);`],
        ["callbacks with a parameter named like a meta property", `function F() { const value = 1; return match(value).onCase(1, target => [target, new.target === undefined]).unwrapOr(0); } return F();`],
        ["callbacks that return nothing where undefined is something else", `return ((undefined) => { const value = 1; return [match(value).onCase(1, () => {}).unwrapOr(0), match(value).onCase(1, () => { return }).unwrapOr(0)]; })(5);`],
        ["nested chains", `const value = 1; const other = 2; return match(value).onCase(1, () => match(other).case(2, "both").unwrapOr("first")).unwrapOr("none");`],
    ]

    for (const [name, body] of bodies) {
        it(`should compile ${name}`, () => {
            const { compiled, original } = run(body)
            expect(compiled).toEqual(original)
        })
    }

    it("should evaluate what is being matched once", () => {
        const { compiled, original } = run(`let calls = 0; const next = () => ++calls; const result = match([next(), next()]).shape([1, 1], "a").shape([1, 2], "b").unwrapOr("c"); return [result, calls];`)
        expect(compiled).toEqual(["b", 2])
        expect(compiled).toEqual(original)
    })

    it("should only evaluate what it needs to", () => {
        // The one difference to running a chain as it is, where every argument is evaluated.
        const results = run(`const value = 1; let count = 0; const result = match(value).case(1, ++count).unwrapOr(++count); return [result, count];`)
        expect(results.compiled).toEqual([1, 1])
        expect(results.original).toEqual([1, 2])
        const values = run(`const value = 1; let count = 0; const result = match(value).case(1, "a").case(++count, "b").unwrapOr("c"); return [result, count];`)
        expect(values.compiled).toEqual(["a", 0])
        expect(values.original).toEqual(["a", 1])
    })

    it("should keep chains it can not compile", () => {
        const kept = [
            `match(a).case(1, 2);`,
            `match(a).case(...b).unwrapOr(3);`,
            `match(a).other(1).unwrapOr(3);`,
            `match(a)?.case(1, 2).unwrapOr(3);`,
            `match(a, b).case(1, 2).unwrapOr(3);`,
            `async () => match(await a).case(1, 2).unwrapOr(3);`,
            `async () => match(a + 1).case(1, await b).unwrapOr(3);`,
        ]
        for (const code of kept) {
            expect(compile(code).code).toBe(code)
        }
    })

    it("should await where that is possible", async () => {
        const { compiled } = run(`return (async () => { const value = 1; return match(value).case(1, await Promise.resolve("one")).unwrapOr("other"); })();`)
        expect(await compiled).toBe("one")
    })

    it("should await a chain as a whole", async () => {
        // Without parentheses around it only the first condition would be awaited.
        const body = `return (async () => { const value = { type: "b" }; const result = await match(value).onShape({ type: "a" }, v => v.type).onShape({ type: "b" }, async v => v.type).unwrap(); return [typeof result, !await match(1).case(1, false).unwrapOr(true)]; })();`
        const { compiled, original } = run(body)
        expect(await compiled).toEqual(["string", true])
        expect(await compiled).toEqual(await original)
        expect(compile(body).code).toContain(`await ((typeof value === "object"`)
    })

    it("should keep the promise of async callbacks", async () => {
        const { compiled } = run(`const value = 1; return match(value).onCase(1, async v => v + 1).unwrapOr(null);`)
        expect(compiled).toBeInstanceOf(Promise)
        expect(await compiled).toBe(2)
    })

    it("should follow renamed imports and ignore other functions called match", () => {
        const renamed = transformMatches(`import { match as m } from "${from}";\nconst a = 0;\nm(a).case(1, 2).unwrapOr(3);\nmatch(a).case(1, 2).unwrapOr(3);`, "source.ts", from)!
        expect(renamed.ms.toString()).toContain(`((a === (1)) ? (2)`)
        expect(renamed.ms.toString()).toContain(`match(a).case(1, 2).unwrapOr(3);`)
        expect(transformMatches(`import { match } from "other";\nmatch(a).case(1, 2).unwrapOr(3);`, "source.ts", from)!.ms.hasChanged()).toBe(false)
        expect(transformMatches(`const a = 0;\nmatch(a).case(1, 2).unwrapOr(3);`, "source.ts", from)!.ms.toString()).toContain(`((a === (1)) ? (2)`)
        expect(run(`function run(match) { return match(1).case(1, 2).unwrapOr(3); } return run(() => ({ case: () => ({ unwrapOr: () => 99 }) }));`).compiled).toBe(99)
    })
})

describe("transformMatches: match.tag", () => {
    const shapes = `[{ kind: "circle", radius: 2 }, { kind: "square", size: 3 }, { kind: "point" }, { kind: "triangle" }, { kind: "toString" }, { kind: ["circle"] }, { kind: "_" }, {}, 1, "a"]`

    const free: [name: string, call: string, values: string, setup?: string][] = [
        ["handlers", `match.tag(value, "kind", { circle: c => c.radius * 2, square: s => s.size, point: () => 0 })`, shapes],
        ["a fallback", `match.tag(value, "kind", { point: () => "point", _: rest => typeof rest === "object" ? String(rest.kind) : rest })`, shapes],
        ["a fallback that is not the last one", `match.tag(value, "kind", { _: () => "other", circle: () => "circle" })`, shapes],
        ["handlers that are names", `match.tag(value, "kind", { circle, square: handlers.square, _: other })`, shapes, `const circle = c => c.radius, handlers = { square(s) { return [this === undefined, s.size] } }, other = () => "other"`],
        ["handlers that are functions", `match.tag(value, "kind", { circle: function (c) { return [this === undefined, c.radius] }, square: async s => s.size, _: (...rest) => rest.length })`, shapes],
        ["handlers that take the value apart", `match.tag(value, "kind", { circle: ({ radius }) => radius, square: (s, other) => [s.size, other], _: () => 0 })`, shapes],
        ["keys that are quoted", `match.tag(value, "my-kind", { "a-b": v => v.id, 'c': () => "c", _: () => "other" })`, `[{ "my-kind": "a-b", id: 1 }, { "my-kind": "c" }, { "my-kind": "d" }]`],
        ["keys that are a template", "match.tag(value, `kind`, { circle: () => 1, _: () => 2 })", shapes],
        ["tags that are booleans", `match.tag(value, "ok", { true: v => v.value, false: v => v.error })`, `[{ ok: true, value: 1 }, { ok: false, error: "e" }, { ok: "true", value: 2 }, { ok: 1 }, { ok: null }]`],
        ["tags that are numbers", `match.tag(value, "v", { 1: () => "one", 2.5: () => "fraction", "-1": () => "minus", 0: () => "zero", 0x10: () => "sixteen", "01": () => "text", _: () => "other" })`, `[{ v: 1 }, { v: "1" }, { v: 2.5 }, { v: -1 }, { v: 0 }, { v: -0 }, { v: 16 }, { v: "01" }, { v: 1n }, { v: NaN }, { v: 3 }]`],
        ["tags that are nothing", `match.tag(value, "v", { null: () => "null", undefined: () => "undefined", _: () => "other" })`, `[{ v: null }, { v: undefined }, {}, { v: "null" }, { v: "undefined" }, { v: 0 }]`],
        ["tags that are infinite", `match.tag(value, "v", { Infinity: () => "up", "-Infinity": () => "down", _: () => "other" })`, `[{ v: Infinity }, { v: -Infinity }, { v: "Infinity" }, { v: 1 }]`],
        ["what is being matched as a name of its own", `match.tag(value.inner, "kind", { a: v => v.id, _: v => v })`, `[{ inner: { kind: "a", id: 1 } }, { inner: { kind: "b" } }, { inner: 1 }]`],
        ["what is being matched without reading it twice", `match.tag(next(), "kind", { a: () => count, b: v => [v.kind, count], _: () => -count })`, `["a", "b", "c"]`, `let count = 0; const next = () => ({ kind: value, count: ++count })`],
    ]

    for (const [name, call, values, setup] of free) {
        it(`should compile ${name}`, () => {
            const { code, unused } = agree(call, values, setup)
            expect(unused).toContain("match")
            expect(code).not.toContain("match.tag")
        })
    }

    it("should compile into what is expected", () => {
        const code = (call: string): string => compile(`const value = 0;\nx = ${call};`).code.split("\n").slice(1).join("\n")
        expect(code(`match.tag(value, "kind", { circle: c => c.radius, point: () => 0 })`)).toBe(`x = (value.kind === "circle" ? (value.radius)\n: value.kind === "point" ? (0)\n: throwUnmatched0(value));`)
        expect(code(`match.tag(value, "kind", { circle: c => c.radius, _: handle })`)).toBe(`x = (value.kind === "circle" ? (value.radius)\n: ((handle)(value)));`)
        expect(code(`match.tag(value, "ok", { true: v => v.value, 1: () => 1, _: () => 0 })`)).toBe(`x = ((value.ok === "true" || value.ok === true) ? (value.value)\n: (value.ok === "1" || value.ok === 1) ? (1)\n: (0));`)
        expect(code(`match.tag(load(), "a-b", { a: v => v.id, _: () => 0 })`)).toBe(`x = ((match0) => match0["a-b"] === "a" ? (match0.id)\n: (0))(load());`)
    })

    it("should throw for what has not been matched, and for what has no tag", () => {
        agree(`match.tag(value, "kind", { circle: () => 1 })`, `[{ kind: "circle" }, { kind: "square" }, {}, 1]`)
        // The message is the one of the engine, which quotes the code.
        const { compiled, original } = run(`return [null, undefined].map(value => { try { return match.tag(value, "kind", { circle: () => 1 }) } catch (error) { return error.constructor.name } });`)
        expect(compiled).toEqual(["TypeError", "TypeError"])
        expect(original).toEqual(compiled)
    })

    it("should keep what can only be looked at once the code runs", () => {
        const kept = [
            `match.tag(value, key, { a: () => 1 })`,
            `match.tag(value, "kind", handlers)`,
            `match.tag(value, "kind", { ...handlers, a: () => 1 })`,
            `match.tag(value, "kind", { [name]: () => 1, _: () => 2 })`,
            `match.tag(value, "kind", { a() { return 1 }, _: () => 2 })`,
            `match.tag(value, "kind", { get a() { return () => 1 }, _: () => 2 })`,
            `match.tag(value, "kind", { a: () => 1, a: () => 2 })`,
            `match.tag(value, "kind", { __proto__: () => 1, a: () => 2 })`,
            `match.tag(value, "kind", { NaN: () => 1, _: () => 2 })`,
            `match.tag(value, "kind", { _: () => 2 })`,
            `match.tag(value, "kind", { 1n: () => 1, _: () => 2 })`,
            `match.tag(value, "kind")`,
            `match.tag(...args)`,
            `match?.tag(value, "kind", { a: () => 1 })`,
            `match.tag?.(value, "kind", { a: () => 1 })`,
            `match["tag"](value, "kind", { a: () => 1 })`,
        ]
        for (const call of kept) {
            const { code, unused } = compile(`const value = { kind: "a" };\nx = ${call};`)
            expect(code).toContain(call)
            expect(unused).toEqual([])
        }
        // `await` can not be moved into a function, a name that stays the same needs none.
        expect(compile(`async function f() { return match.tag(await load(), "kind", { a: () => 1 }) }`).code).toContain("match.tag(await load()")
        expect(compile(`async function f(value) { return match.tag(value, "kind", { a: async v => await v.id }) }`).code).not.toContain("match.tag")
    })

    it("should agree for the handlers that are kept", () => {
        agree(`match.tag(value, "kind", { a() { return 1 }, _: () => 2 })`, `[{ kind: "a" }, { kind: "b" }]`)
        agree(`match.tag(value, "kind", { NaN: () => 1, _: () => 2 })`, `[{ kind: NaN }, { kind: "NaN" }, { kind: 1 }]`)
    })

    it("should leave something else of the same name alone", () => {
        const { code } = compile(`function run(match) { return match.tag(value, "kind", { a: () => 1 }) }`)
        expect(code).toContain(`match.tag(value, "kind"`)
    })

    it("should compile what is inside of handlers, and of chains", () => {
        const from = "@monstermann/stdlib"
        const source = `import { match } from "${from}";\nconst value = { kind: "a", inner: { kind: "b" } };\nexport const x = match.tag(value, "kind", { a: v => match.tag(v.inner, "kind", { b: () => match(v).shape({ kind: "a" }, 1).unwrapOr(2), _: () => 3 }), _: () => 4 });`
        let code = source
        for (let result = transformMatches(code, "source.ts", from); result?.ms.hasChanged(); result = transformMatches(code, "source.ts", from)) code = result.ms.toString()
        expect(code).not.toContain("match.tag")
        expect(code).not.toContain("match(")
    })
})
