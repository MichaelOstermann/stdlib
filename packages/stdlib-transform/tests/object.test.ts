import { describe, expect, it } from "bun:test"
import { merge } from "../../stdlib/src/Object/merge"
import { pick } from "../../stdlib/src/Object/pick"
import { transformObjects } from "../src/object"

function run(code: string): string {
    return transformObjects(code, "source.ts").toString()
}

/** What a call returns once it has been compiled, next to what the function itself returns. */
function both(call: string, target: object, fn: (target: any) => unknown): [unknown, unknown] {
    const compiled = run(`return ${call}`)
    expect(compiled).not.toMatch(/Object\.(merge|pick)\(/)
    return [new Function("target", compiled)(target), fn(target)]
}

describe("transformObjects", () => {
    it("should compile a merge into a function of its own", () => {
        expect(run(`const a = Object.merge(task, { title: "New", done })`)).toBe(`const a = merge0(task, "New", done)
function merge0(t, v0, v1) {
    if (Object.is(t.title, v0) && "title" in t && Object.is(t.done, v1) && "done" in t) return t
    return { ...t, title: v0, done: v1 }
}
`)
    })

    it("should compile a pick into a function of its own", () => {
        expect(run(`const a = Object.pick(task, ["id", "a-b", "id"])`)).toBe(`const a = pick0(task)
function pick0(t) {
    const r = {}
    if (Object.hasOwn(t, "id")) r.id = t.id
    if (Object.hasOwn(t, "a-b")) r["a-b"] = t["a-b"]
    return r
}
`)
    })

    it("should share the function of the same keys, and not take a name that is used", () => {
        const code = run(`const merge0 = 1; Object.merge(a, { x: 1 }); Object.merge(b, { "x": 2 }); Object.merge(c, { y: 3 }); Object.pick(a, ["x"]); Object.pick(b, [\`x\`])`)
        expect(code).toStartWith(`const merge0 = 1; merge1(a, 1); merge1(b, 2); merge2(c, 3); pick0(a); pick0(b)`)
        expect(code.match(/function merge/g)).toHaveLength(2)
        expect(code.match(/function pick/g)).toHaveLength(1)
    })

    it("should compile calls inside of the target and the values", () => {
        expect(run(`Object.merge(Object.pick(s, ["a"]), { a: Object.merge(t, { a: 2 }), b: 1, })`)).toStartWith(`merge0(pick0(s), merge1(t, 2), 1)`)
    })

    it("should leave calls it can not compile", () => {
        for (const code of [
            `Object.merge(task, source)`,
            `Object.merge(task, {})`,
            `Object.merge(task, { ...rest })`,
            `Object.merge(task, { [key]: 1 })`,
            `Object.merge(task, { a() {} })`,
            `Object.merge(task, { get a() { return 1 } })`,
            `Object.merge(task, { a: 1, a: 2 })`,
            `Object.merge(task, { __proto__: null })`,
            `Object.merge(task, { 1: "a" })`,
            `Object.merge(...args)`,
            `Object?.merge(task, { a: 1 })`,
            `Object.pick(task, keys)`,
            `Object.pick(task, ["a", key])`,
            `Object.pick(task, ["a", ...keys])`,
            `Object.pick(task, ["a", , "b"])`,
            `Object.pick(task, ["__proto__"])`,
            `function f(Object) { return Object.pick(task, ["a"]) }`,
        ]) expect(run(code)).toBe(code)
    })

    it("should do what Object.merge does", () => {
        const task = { done: false, id: 1, title: "Old" }
        const [same, expected] = both(`Object.merge(target, { title: "Old", done: false })`, task, (t) => merge(t, { done: false, title: "Old" }))
        expect(same).toBe(task)
        expect(expected).toBe(task)
        const [changed, merged] = both(`Object.merge(target, { title: "New", "a-b": 1 })`, task, (t) => merge(t, { "a-b": 1, "title": "New" }))
        expect(changed).toEqual(merged)
        expect(Object.keys(changed as object)).toEqual(Object.keys(merged as object))
        expect(both(`Object.merge(target, { a: undefined })`, {}, (t) => merge(t, { a: undefined }))[0]).toEqual({ a: undefined })
    })

    it("should do what Object.pick does", () => {
        const task = { "a-b": 2, "done": false, "id": 1, "title": "Old" }
        const [picked, expected] = both(`Object.pick(target, ["title", "id", "missing", "a-b"])`, task, (t) => pick(t, ["title", "id", "missing", "a-b"]))
        expect(picked).toEqual(expected)
        expect(Object.keys(picked as object)).toEqual(Object.keys(expected as object))
        // Only own properties.
        expect(both(`Object.pick(target, ["toString"])`, task, (t) => pick(t, ["toString"]))).toEqual([{}, {}])
    })
})
