import type { Node } from "oxc-parser"
import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { ScopeTracker, walk } from "oxc-walker"
import { access, id, isObjectCall, property } from "../setPath"

/**
 * Compiles `Object.merge` calls whose source is an object literal into a function of their own, one
 * per set of keys and module:
 *
 * ```ts
 * Object.merge(task, { title: "New", done })
 * ```
 *
 * ```ts
 * merge0(task, "New", done)
 *
 * function merge0(t, v0, v1) {
 *     if (Object.is(t.title, v0) && Object.is(t.done, v1)) return t
 *     return { ...t, title: v0, done: v1 }
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

    /** The name of the function of each set of keys. */
    const functions = new Map<string, { keys: string[], name: string }>()
    const nameOf = (keys: string[]): string => {
        const key = JSON.stringify(keys)
        let fn = functions.get(key)
        if (!fn) functions.set(key, fn = { keys, name: id(ids, "merge") })
        return fn.name
    }

    walk(program, {
        scopeTracker,
        enter(node) {
            if (node.type !== "CallExpression" || node.optional || !isObjectCall(node.callee, "merge")) return
            if (scopeTracker.getDeclaration("Object")) return
            if (node.arguments.length !== 2 || node.arguments.some((argument) => argument.type === "SpreadElement")) return
            const [target, source] = node.arguments as [Node, Node]

            const entries = entriesOf(source)
            if (!entries) return
            ms.overwrite(node.callee.start, node.callee.end, nameOf(entries.map(([key]) => key)))
            // The values stay where they are, for calls inside of them to be compiled as well.
            let end = target.end
            for (const [, value] of entries) {
                ms.overwrite(end, value.start, ", ")
                end = value.end
            }
            ms.overwrite(end, node.end, ")")
        },
    })

    // Declarations are hoisted, so they can go at the end, where every line before stays where it is.
    for (const { keys, name } of functions.values()) ms.append(`\n${compileMerge(name, keys)}\n`)
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

/** A function that compares each property, and copies `t` once one differs. */
function compileMerge(name: string, keys: string[]): string {
    const values = keys.map((_, index) => `v${index}`)
    // Object.is, as everywhere else: V8 compares objects with === several times slower.
    const same = keys.map((key, index) => `Object.is(t${access(key)}, ${values[index]})`).join(" && ")
    const copy = keys.map((key, index) => `${property(key)}: ${values[index]}`).join(", ")
    return [
        `function ${name}(t, ${values.join(", ")}) {`,
        `    if (${same}) return t`,
        `    return { ...t, ${copy} }`,
        `}`,
    ].join("\n")
}
