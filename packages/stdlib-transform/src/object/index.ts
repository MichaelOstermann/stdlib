import type { Node } from "oxc-parser"
import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { ScopeTracker, walk } from "oxc-walker"
import { access, id, isNativeObject, isObjectCall, property } from "../path"

/**
 * Compiles `Object.merge` calls whose source is an object literal, and `Object.pick` calls whose
 * keys are an array of strings, into a function of their own, one per set of keys and module:
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
 * ```ts
 * Object.pick(user, ["email", "name"])
 * ```
 *
 * ```ts
 * pick0(user)
 *
 * function pick0(t) {
 *     return { email: t.email, name: t.name }
 * }
 * ```
 *
 * A call whose keys are not known until the code runs is left as it is.
 */
export function transformObjects(code: string, filePath: string, from: string): MagicString {
    const { program } = parseSync(filePath, code)
    const ms = new MagicString(code, { filename: filePath })

    // Collects all declarations, to tell whether `Object` is the native one or its replica where it is used.
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
    const merges = new Map<string, { keys: string[], name: string }>()
    const mergeOf = (keys: string[]): string => {
        const key = JSON.stringify(keys)
        let fn = merges.get(key)
        if (!fn) merges.set(key, fn = { keys, name: id(ids, "merge") })
        return fn.name
    }

    const picks = new Map<string, { keys: string[], name: string }>()
    const pickOf = (keys: string[]): string => {
        const key = JSON.stringify(keys)
        let fn = picks.get(key)
        if (!fn) picks.set(key, fn = { keys, name: id(ids, "pick") })
        return fn.name
    }

    walk(program, {
        scopeTracker,
        enter(node) {
            if (node.type !== "CallExpression" || node.optional || !isObjectCall(node.callee, "pick")) return
            if (!isNativeObject(scopeTracker, from)) return
            if (node.arguments.length !== 2 || node.arguments.some((argument) => argument.type === "SpreadElement")) return
            const [target, keysNode] = node.arguments as [Node, Node]

            const keys = keysOf(keysNode)
            if (!keys) return
            ms.overwrite(node.callee.start, node.callee.end, pickOf(keys))
            ms.overwrite(target.end, node.end, ")")
        },
    })

    walk(program, {
        scopeTracker,
        enter(node) {
            if (node.type !== "CallExpression" || node.optional || !isObjectCall(node.callee, "merge")) return
            if (!isNativeObject(scopeTracker, from)) return
            if (node.arguments.length !== 2 || node.arguments.some((argument) => argument.type === "SpreadElement")) return
            const [target, source] = node.arguments as [Node, Node]

            const entries = entriesOf(source)
            if (!entries) return
            ms.overwrite(node.callee.start, node.callee.end, mergeOf(entries.map(([key]) => key)))
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
    for (const { keys, name } of merges.values()) ms.append(`\n${compileMerge(name, keys)}\n`)
    for (const { keys, name } of picks.values()) ms.append(`\n${compilePick(name, keys)}\n`)
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

/**
 * The strings of `["a", "b"]`. Nothing for anything else: a spread, a hole, a value that is not a
 * string, and `__proto__`, which sets the prototype in an object literal instead of a property.
 */
function keysOf(node: Node): string[] | undefined {
    if (node.type !== "ArrayExpression" || !node.elements.length) return
    const keys: string[] = []
    for (const element of node.elements) {
        if (element?.type !== "Literal" || typeof element.value !== "string" || element.value === "__proto__") return
        keys.push(element.value)
    }
    return keys
}

/** A function that returns an object of the keys. */
function compilePick(name: string, keys: string[]): string {
    const copy = keys.map((key) => `${property(key)}: t${access(key)}`).join(", ")
    return [
        `function ${name}(t) {`,
        `    return { ${copy} }`,
        `}`,
    ].join("\n")
}
