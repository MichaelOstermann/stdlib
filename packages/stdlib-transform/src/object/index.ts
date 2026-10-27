import type { Node } from "oxc-parser"
import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { ScopeTracker, walk } from "oxc-walker"
import { access, id, isObjectCall, property, stringOf } from "../setPath"

/**
 * Compiles `Object.merge` calls whose source is an object literal, and `Object.pick` calls whose
 * keys are an array of strings, into a function of their own, one per set of keys and module:
 *
 * ```ts
 * Object.merge(task, { title: "New", done })
 * Object.pick(task, ["id", "title"])
 * ```
 *
 * ```ts
 * merge0(task, "New", done)
 * pick0(task)
 *
 * function merge0(t, v0, v1) {
 *     if (Object.is(t.title, v0) && "title" in t && Object.is(t.done, v1) && "done" in t) return t
 *     return { ...t, title: v0, done: v1 }
 * }
 *
 * function pick0(t) {
 *     const r = {}
 *     if (Object.hasOwn(t, "id")) r.id = t.id
 *     if (Object.hasOwn(t, "title")) r.title = t.title
 *     return r
 * }
 * ```
 *
 * A call whose keys are not known until the code runs is left as it is.
 */
export function transformObjects(code: string, filePath: string): MagicString {
    const { program } = parseSync(filePath, code)
    const ms = new MagicString(code, { filename: filePath })

    // Collects all declarations, to tell whether `Object` is the global where it is used.
    const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
    walk(program, { scopeTracker })
    scopeTracker.freeze()

    const ids = new Set<string>()
    walk(program, {
        enter(node) {
            if (node.type === "Identifier") ids.add(node.name)
        },
    })

    /** The name of the function of each set of keys, and what it compiles. */
    const functions = new Map<string, { keys: string[], name: string, compile: (name: string, keys: string[]) => string }>()
    const nameOf = (base: "merge" | "pick", keys: string[], compile: (name: string, keys: string[]) => string): string => {
        const key = `${base}:${JSON.stringify(keys)}`
        let fn = functions.get(key)
        if (!fn) functions.set(key, fn = { compile, keys, name: id(ids, base) })
        return fn.name
    }

    walk(program, {
        scopeTracker,
        enter(node) {
            if (node.type !== "CallExpression" || node.optional) return
            const isMerge = isObjectCall(node.callee, "merge")
            if (!isMerge && !isObjectCall(node.callee, "pick")) return
            if (scopeTracker.getDeclaration("Object")) return
            if (node.arguments.length !== 2 || node.arguments.some((argument) => argument.type === "SpreadElement")) return
            const [target, source] = node.arguments as [Node, Node]

            if (isMerge) {
                const entries = entriesOf(source)
                if (!entries) return
                const keys = entries.map(([key]) => key)
                ms.overwrite(node.callee.start, node.callee.end, nameOf("merge", keys, compileMerge))
                // The values stay where they are, for calls inside of them to be compiled as well.
                let end = target.end
                for (const [, value] of entries) {
                    ms.overwrite(end, value.start, ", ")
                    end = value.end
                }
                ms.overwrite(end, node.end, ")")
            }
            else {
                const keys = keysOf(source)
                if (!keys) return
                ms.overwrite(node.callee.start, node.callee.end, nameOf("pick", keys, compilePick))
                ms.overwrite(target.end, node.end, ")")
            }
        },
    })

    // Declarations are hoisted, so they can go at the end, where every line before stays where it is.
    for (const { compile, keys, name } of functions.values()) ms.append(`\n${compile(name, keys)}\n`)
    return ms
}

/**
 * The keys and values of `{ a: 1, "b": 2, c }`. Nothing for anything else: a spread, a computed
 * key, a method or accessor, a key that occurs twice, and `__proto__`, which sets the prototype
 * instead of a property.
 */
function entriesOf(node: Node): [string, Node][] | undefined {
    if (node.type !== "ObjectExpression" || !node.properties.length) return
    const entries: [string, Node][] = []
    for (const prop of node.properties) {
        if (prop.type !== "Property" || prop.computed || prop.method || prop.kind !== "init") return
        const key = prop.key.type === "Identifier" ? prop.key.name : prop.key.type === "Literal" && typeof prop.key.value === "string" ? prop.key.value : undefined
        if (key === undefined || key === "__proto__" || entries.some(([other]) => other === key)) return
        entries.push([key, prop.value])
    }
    return entries
}

/** The strings of `["a", "b"]`, once each. */
function keysOf(node: Node): string[] | undefined {
    if (node.type !== "ArrayExpression") return
    const keys: string[] = []
    for (const element of node.elements) {
        const key = element && element.type !== "SpreadElement" ? stringOf(element) : undefined
        if (key === undefined || key === "__proto__") return
        if (!keys.includes(key)) keys.push(key)
    }
    return keys
}

/** A function that compares each property, and copies `t` once one differs. */
function compileMerge(name: string, keys: string[]): string {
    const values = keys.map((_, index) => `v${index}`)
    // Object.is, as everywhere else: V8 compares objects with === several times slower.
    const same = keys.map((key, index) => `Object.is(t${access(key)}, ${values[index]}) && ${JSON.stringify(key)} in t`).join(" && ")
    const copy = keys.map((key, index) => `${property(key)}: ${values[index]}`).join(", ")
    return [
        `function ${name}(t, ${values.join(", ")}) {`,
        `    if (${same}) return t`,
        `    return { ...t, ${copy} }`,
        `}`,
    ].join("\n")
}

/** A function that copies each property `t` has of its own. */
function compilePick(name: string, keys: string[]): string {
    return [
        `function ${name}(t) {`,
        `    const r = {}`,
        ...keys.map((key) => `    if (Object.hasOwn(t, ${JSON.stringify(key)})) r${access(key)} = t${access(key)}`),
        `    return r`,
        `}`,
    ].join("\n")
}
