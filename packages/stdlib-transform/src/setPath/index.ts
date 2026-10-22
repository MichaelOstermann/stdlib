import type { Node } from "oxc-parser"
import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { ScopeTracker, walk } from "oxc-walker"

/**
 * Compiles `Object.setPath` calls whose path is written out into a function of their own, one per path and module:
 *
 * ```ts
 * Object.setPath(state, "user.settings.theme", "dark")
 * ```
 *
 * ```ts
 * setPath0(state, "dark")
 *
 * function setPath0(t, v) {
 *     const t0 = t.user, t1 = t0.settings, t2 = t1.theme
 *     if (t2 === v && "theme" in t1) return t
 *     return { ...t, user: { ...t0, settings: { ...t1, theme: v } } }
 * }
 * ```
 *
 * A call whose path is not known until the code runs is left as it is.
 */
export function transformSetPaths(code: string, filePath: string): MagicString {
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

    /** The name of the function of each path. */
    const functions = new Map<string, string>()

    walk(program, {
        scopeTracker,
        enter(node) {
            if (node.type !== "CallExpression" || node.optional || !isSetPath(node.callee)) return
            if (scopeTracker.getDeclaration("Object")) return

            const [target, path, value] = node.arguments
            if (node.arguments.length !== 3 || node.arguments.some((argument) => argument.type === "SpreadElement")) return
            const keys = stringOf(path!)?.split(".")
            // `__proto__` in an object literal sets the prototype instead of a property.
            if (!keys || keys.some((key) => !key || key === "__proto__")) return

            let name = functions.get(keys.join("."))
            if (!name) {
                name = id(ids, "setPath")
                functions.set(keys.join("."), name)
            }

            // Only the callee and the path are replaced: calls inside of the target or the value are compiled as well.
            ms.overwrite(node.callee.start, node.callee.end, name)
            ms.overwrite(target!.end, value!.start, ", ")
        },
    })

    // Declarations are hoisted, so they can go at the end, where every line before stays where it is.
    for (const [path, name] of functions) ms.append(`\n${compile(name, path.split("."))}\n`)
    return ms
}

/** `Object.setPath` */
function isSetPath(node: Node): boolean {
    return node.type === "MemberExpression"
        && !node.computed
        && !node.optional
        && node.object.type === "Identifier"
        && node.object.name === "Object"
        && node.property.type === "Identifier"
        && node.property.name === "setPath"
}

/** The string of `"a.b"` or `` `a.b` ``. */
function stringOf(node: Node): string | undefined {
    if (node.type === "Literal" && typeof node.value === "string") return node.value
    if (node.type === "TemplateLiteral" && !node.expressions.length) return node.quasis[0]!.value.cooked ?? undefined
    return undefined
}

function id(ids: Set<string>, base: string): string {
    let count = 0
    while (ids.has(`${base}${count}`)) count++
    ids.add(`${base}${count}`)
    return `${base}${count}`
}

/** A function that reads down to the value, and copies each level on the way when it differs. */
function compile(name: string, keys: string[]): string {
    const last = keys.length - 1
    // t0 is the first level, the value itself is the last one read.
    const levels = keys.map((_, index) => `t${index}`)
    const parent = (index: number): string => index === 0 ? "t" : levels[index - 1]!
    const reads = keys.map((key, index) => `${levels[index]} = ${parent(index)}${access(key)}`).join(", ")

    let copy = "v"
    for (let index = last; index >= 0; index--) copy = `{ ...${parent(index)}, ${property(keys[index]!)}: ${copy} }`

    const current = levels[last]!
    return [
        `function ${name}(t, v) {`,
        `    const ${reads}`,
        `    if (${current} === v && ${JSON.stringify(keys[last])} in ${parent(last)}) return t`,
        `    return ${copy}`,
        `}`,
    ].join("\n")
}

function access(key: string): string {
    return isIdentifier(key) ? `.${key}` : `[${JSON.stringify(key)}]`
}

function property(key: string): string {
    return isIdentifier(key) ? key : JSON.stringify(key)
}

function isIdentifier(key: string): boolean {
    return /^[a-z_$][\w$]*$/i.test(key)
}
