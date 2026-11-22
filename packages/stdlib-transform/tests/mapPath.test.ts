import { describe, expect, it } from "bun:test"
import { mapPath } from "../../stdlib/src/Object/mapPath"
import { transformPaths } from "../src/path"

function run(code: string): string {
    return transformPaths(code, "source.ts", "@monstermann/stdlib").toString()
}

/** What a call returns once it has been compiled, next to what `Object.mapPath` returns. */
function both(path: string, target: object, map: (value: any) => unknown): [unknown, unknown] {
    const compiled = run(`return Object.mapPath(target, ${JSON.stringify(path)}, map)`)
    expect(compiled).not.toContain("Object.mapPath")
    return [new Function("target", "map", compiled)(target, map), mapPath(target as any, path as never, map as never)]
}

describe("transformPaths, mapPath", () => {
    it("should compile a path into a function of its own", () => {
        expect(run(`const a = Object.mapPath(state, "user.settings.theme", toggle)`)).toBe(`const a = mapPath0(state, toggle)
function mapPath0(t, f) {
    const t0 = t.user, t1 = t0.settings, t2 = t1.theme
    const v = f(t2)
    if (Object.is(t2, v)) return t
    return { ...t, user: { ...t0, settings: { ...t1, theme: v } } }
}
`)
    })

    it("should not share a function between setPath and mapPath of the same path", () => {
        const code = run(`Object.setPath(a, "x", 1); Object.mapPath(b, "x", f); Object.mapPath(c, "x", g)`)
        expect(code).toStartWith(`setPath0(a, 1); mapPath0(b, f); mapPath0(c, g)`)
        expect(code.match(/function \w+Path/g)).toHaveLength(2)
    })

    it("should leave calls it can not compile", () => {
        for (const code of [
            `Object.mapPath(state, path, f)`,
            `Object.mapPath(state, "a.__proto__", f)`,
            `Object.mapPath(...args)`,
            `function f(Object) { return Object.mapPath(state, "a", f) }`,
        ]) expect(run(code)).toBe(code)
    })

    it("should do what Object.mapPath does", () => {
        const state = { "a-b": { c: 1 }, "user": { name: "Ada", settings: { theme: "light" } } }
        const [same, expected] = both("user.settings.theme", state, (theme) => theme)
        expect(same).toBe(state)
        expect(expected).toBe(state)
        const [compiled, runtime] = both("user.settings.theme", state, () => "dark")
        expect(compiled).toEqual(runtime)
        expect(both("a-b.c", state, (c: number) => c + 1)[0]).toEqual({ ...state, "a-b": { c: 2 } })
    })
})
