import { describe, expect, it } from "bun:test"
import { _ } from "../../stdlib/src/_"
import { matches } from "../../stdlib/src/internals/match/matches"
import { throwUnmatched } from "../../stdlib/src/internals/match/throwUnmatched"
import { match } from "../../stdlib/src/match"
import { transformMatches } from "../src/match"

// Chains that are made up, to see that running them as they are and compiled comes to the same,
// for more of them than anyone would write down.

const from = "@monstermann/stdlib"

/** Always the same numbers for the same seed, to be able to look at what went wrong. */
function random(seed: number): () => number {
    return () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296
        return seed / 4294967296
    }
}

const setup = `
    const ONE = 1, A = "a", object = { a: 1 }, tuple = [1, 2], Kind = { a: "a", one: 1, nan: NaN, object };
    const shapeA = { a: 1 }, shapeAB = { a: 1, b: 2 }, pair = [1, _], key = "a";
    let changing = 1, calls = 0;
    const methods = { self() { return this === undefined ? "free" : "bound" }, id(v) { return v } };
    const next = () => ++calls;
    const values = [1, 2, "a", "b", null, undefined, NaN, 0, -0, true, object, tuple, { a: 1 }, { a: 1, b: 2 }, { a: "a" }, { a: NaN }, { b: 2 }, {}, [], [1], [1, 2], [1, 3], ["a", 1], [NaN, 2], [_, 1], _, "ab"];
`

const scalars = [`1`, `2`, `"a"`, `"b"`, `null`, `undefined`, `NaN`, `0`, `true`, `ONE`, `A`, `Kind.a`, `Kind.one`, `Kind.nan`, `Kind.object`, `object`, `tuple`, `changing`, `-1`, `1 + 1`, `\`a\``, `value`, `_`]
const keys = [`a`, `b`, `"a"`, `"c-d"`, `["a"]`, `[key]`, `0`]
// Nothing that does something when it is evaluated, which only the branch that is taken is when compiled.
const results = [`1`, `"r"`, `value`, `object`, `methods.self`, `methods.id`, `next`, `[value]`, `{ value }`, `changing`]
const callbacks = [`v => v`, `() => "c"`, `v => [v, typeof v]`, `(v) => { return v }`, `function (v) { return [v, arguments.length] }`, `methods.self`, `methods.id`, `v => () => v`, `v => ({ v })`, `([a, b]) => [b, a]`, `v => v?.a`]
const predicates = [`v => v === 1`, `v => typeof v === "string"`, `() => false`, `() => true`, `Array.isArray`, `v => v != null && v.a === 1`, `v => (changing++, false)`, `methods.id`]
const subjects = [`value`, `value`, `value`, `[value, other]`, `[value, 1]`, `(value)`, `Kind.one === 1 ? value : value`]

function generate(next: () => number): string {
    const pick = <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)]!
    const some = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1))
    const many = (make: () => string, min: number, max: number): string => Array.from({ length: some(min, max) }, make).join(", ")

    const scalar = (): string => pick(scalars)
    const element = (): string => next() < 0.3 ? pick([`_`, `match._`]) : scalar()
    const object = (): string => `{ ${many(() => `${pick(keys)}: ${scalar()}`, 0, 3)} }`
    const array = (): string => `[${many(element, 0, 3)}]`
    const shape = (): string => {
        const kind = next()
        if (kind < 0.4) return object()
        if (kind < 0.8) return array()
        return pick([`shapeA`, `shapeAB`, `pair`, `{ ...shapeA, b: 2 }`, `[...tuple]`, `{ __proto__: null, a: 1 }`, `{ a: 1, a: 2 }`, `1`, `Kind.object`])
    }

    const steps: string[] = []
    for (let i = some(0, 5); i > 0; i--) {
        const kind = next()
        if (kind < 0.25) steps.push(`.case(${many(scalar, 1, 3)}, ${pick(results)})`)
        else if (kind < 0.4) steps.push(`.onCase(${many(scalar, 1, 3)}, ${pick(callbacks)})`)
        else if (kind < 0.65) steps.push(`.shape(${many(shape, 1, 2)}, ${pick(results)})`)
        else if (kind < 0.8) steps.push(`.onShape(${many(shape, 1, 2)}, ${pick(callbacks)})`)
        else if (kind < 0.9) steps.push(`.cond(${pick(predicates)}, ${pick(results)})`)
        else steps.push(`.onCond(${pick(predicates)}, ${pick(callbacks)})`)
    }

    const end = next()
    const ending = end < 0.4 ? `.unwrapOr(${pick(results)})` : end < 0.7 ? `.unwrapOrElse(${pick(callbacks)})` : `.unwrap()`
    return `match(${pick(subjects)})${steps.join("")}${ending}`
}

/**
 * Runs a chain for each of the values, telling what it returned or threw, and what it left behind.
 */
function evaluate(chain: string, compiled: boolean): { code: string, result: string } {
    const body = `${setup}
        const describe = (result) => typeof result === "function" ? "function " + describe(result(7)) : typeof result === "symbol" ? String(result) : result;
        const results = values.map((value, index) => {
            const other = values[(index + 1) % values.length];
            try { return describe(${chain}) } catch (error) { return "threw " + error.message }
        });
        return results;`
    const transformed = transformMatches(`import { _, match } from "${from}";\n${body}`, "source.ts", from)!.ms.toString().replace(/^(?:import .*\n)+/, "")
    const code = compiled ? transformed : body
    const result = new Function("match", "_", "matches0", "throwUnmatched0", `"use strict";${code}`)(match, _, matches, throwUnmatched)
    return { code, result: Bun.inspect(result, { depth: 6 }) }
}

describe("transformMatches", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        it(`should compile made up chains the way they run, starting from ${seed}`, () => {
            const next = random(seed)
            let compiled = 0
            for (let i = 0; i < 250; i++) {
                const chain = generate(next)
                const expected = evaluate(chain, false)
                const actual = evaluate(chain, true)
                if (actual.code !== expected.code) compiled++
                if (actual.result !== expected.result) throw new Error(`Compiled and as it is do not agree:\n${chain}\n\n${actual.code}\n\n${expected.result}\n\n${actual.result}`)
            }
            // Most of them are something the compiler takes.
            expect(compiled).toBeGreaterThan(200)
        })
    }
})
