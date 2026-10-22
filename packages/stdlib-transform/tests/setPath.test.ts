import { describe, expect, it } from "bun:test"
import { setPath } from "../../stdlib/src/Object/setPath"
import { transformSetPaths } from "../src/setPath"

function run(code: string): string {
    return transformSetPaths(code, "source.ts").toString()
}

/** What a call returns once it has been compiled, next to what `Object.setPath` returns. */
function both(path: string, target: object, value: unknown): [unknown, unknown] {
    const compiled = run(`return Object.setPath(target, ${JSON.stringify(path)}, value)`)
    expect(compiled).not.toContain("Object.setPath")
    return [new Function("target", "value", compiled)(target, value), setPath(target as any, path as never, value as never)]
}

describe("transformSetPaths", () => {
    it("should compile a path into a function of its own", () => {
        expect(run(`const a = Object.setPath(state, "user.settings.theme", "dark")`)).toBe(`const a = setPath0(state, "dark")
function setPath0(t, v) {
    const t0 = t.user, t1 = t0.settings, t2 = t1.theme
    if (t2 === v && "theme" in t1) return t
    return { ...t, user: { ...t0, settings: { ...t1, theme: v } } }
}
`)
    })

    it("should share the function of a path, and not take a name that is used", () => {
        const code = run(`const setPath0 = 1; Object.setPath(a, "x", 1); Object.setPath(b, \`x\`, 2); Object.setPath(c, "y", 3)`)
        expect(code).toStartWith(`const setPath0 = 1; setPath1(a, 1); setPath1(b, 2); setPath2(c, 3)`)
        expect(code.match(/function setPath/g)).toHaveLength(2)
    })

    it("should compile calls inside of the target and the value", () => {
        expect(run(`Object.setPath(Object.setPath(s, "a", 1), "b", Object.setPath(t, "a", 2))`)).toStartWith(`setPath0(setPath1(s, 1), setPath1(t, 2))`)
    })

    it("should leave calls it can not compile", () => {
        for (const code of [
            `Object.setPath(state, path, 1)`,
            `Object.setPath(state, \`a.\${b}\`, 1)`,
            `Object.setPath(state, "a.__proto__", 1)`,
            `Object.setPath(state, "a..b", 1)`,
            `Object.setPath(...args)`,
            `Object?.setPath(state, "a", 1)`,
            `function f(Object) { return Object.setPath(state, "a", 1) }`,
        ]) expect(run(code)).toBe(code)
    })

    it("should do what Object.setPath does", () => {
        const state = { "a-b": { c: 1 }, "user": { name: "Ada", settings: { theme: "light" } } }
        const [same, expected] = both("user.settings.theme", state, "light")
        expect(same).toBe(state)
        expect(expected).toBe(state)
        expect(both("user.settings.theme", state, "dark")).toEqual([setPath(state, "user.settings.theme", "dark"), setPath(state, "user.settings.theme", "dark")])
        expect(both("a-b.c", state, 2)[0]).toEqual({ ...state, "a-b": { c: 2 } })
        expect(both("user", state, undefined)[0]).toEqual({ ...state, user: undefined })
        const missing: { a?: number } = {}
        expect(both("a", missing, undefined)[0]).toEqual({ a: undefined })
    })
})
