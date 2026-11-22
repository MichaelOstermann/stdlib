import type { Node } from "oxc-parser"
import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { ScopeTracker, walk } from "oxc-walker"

/**
 * Compiles `Object.setPath` and `Object.mapPath` calls with a written-out path into a function of
 * their own, one per path and module:
 *
 * ```ts
 * Object.setPath(state, "user.settings.theme", "dark")
 * Object.mapPath(state, "user.settings.theme", toggle)
 * ```
 *
 * ```ts
 * setPath0(state, "dark")
 * mapPath0(state, toggle)
 *
 * function setPath0(t, v) {
 *     const t0 = t.user, t1 = t0.settings, t2 = t1.theme
 *     if (Object.is(t2, v)) return t
 *     return { ...t, user: { ...t0, settings: { ...t1, theme: v } } }
 * }
 *
 * function mapPath0(t, f) {
 *     const t0 = t.user, t1 = t0.settings, t2 = t1.theme
 *     const v = f(t2)
 *     if (Object.is(t2, v)) return t
 *     return { ...t, user: { ...t0, settings: { ...t1, theme: v } } }
 * }
 * ```
 *
 * A call whose path is not known until the code runs is left as it is.
 */
export function transformPaths(code: string, filePath: string, from: string): MagicString {
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

    /** The function for each kind and path, keyed like `setPath:a.b`. */
    const functions = new Map<string, { keys: string[], kind: PathKind, name: string }>()

    walk(program, {
        scopeTracker,
        enter(node) {
            if (node.type !== "CallExpression" || node.optional) return
            const kind = pathKindOf(node.callee)
            if (!kind) return
            if (!isNativeObject(scopeTracker, from)) return

            const [target, path, value] = node.arguments
            if (node.arguments.length !== 3 || node.arguments.some((argument) => argument.type === "SpreadElement")) return
            const keys = stringOf(path!)?.split(".")
            // `__proto__` in an object literal sets the prototype instead of a property.
            if (!keys || keys.some((key) => !key || key === "__proto__")) return

            const kindAndPath = `${kind}:${keys.join(".")}`
            if (!functions.has(kindAndPath)) functions.set(kindAndPath, { keys, kind, name: id(ids, kind) })
            const { name } = functions.get(kindAndPath)!

            // Only the callee and the path are replaced: calls inside of the target or the value are compiled as well.
            ms.overwrite(node.callee.start, node.callee.end, name)
            ms.overwrite(target!.end, value!.start, ", ")
        },
    })

    // Declarations are hoisted, so they can go at the end, where every line before stays where it is.
    for (const { keys, kind, name } of functions.values()) ms.append(`\n${compile(name, kind, keys)}\n`)
    return ms
}

/**
 * Whether `Object` is the native `Object` or its replica: `import { Object } from
 * "@monstermann/stdlib"`
 */
export function isNativeObject(scopeTracker: ScopeTracker, from: string): boolean {
    const declaration = scopeTracker.getDeclaration("Object")
    if (!declaration) return true
    if (declaration.type !== "Import" || declaration.node.type !== "ImportSpecifier") return false
    const imported = declaration.node.imported
    const name = imported.type === "Identifier" ? imported.name : imported.value
    return name === "Object" && [from, `${from}/Object/index`].includes(declaration.importNode.source.value)
}

type PathKind = "mapPath" | "setPath"

function pathKindOf(callee: Node): PathKind | undefined {
    if (isObjectCall(callee, "setPath")) return "setPath"
    if (isObjectCall(callee, "mapPath")) return "mapPath"
    return undefined
}

/** `Object.setPath`, `Object.merge`, … */
export function isObjectCall(node: Node, name: string): boolean {
    return node.type === "MemberExpression"
        && !node.computed
        && !node.optional
        && node.object.type === "Identifier"
        && node.object.name === "Object"
        && node.property.type === "Identifier"
        && node.property.name === name
}

/** Returns the string of `"a.b"` or `` `a.b` ``. */
function stringOf(node: Node): string | undefined {
    if (node.type === "Literal" && typeof node.value === "string") return node.value
    if (node.type === "TemplateLiteral" && !node.expressions.length) return node.quasis[0]!.value.cooked ?? undefined
    return undefined
}

export function id(ids: Set<string>, base: string): string {
    let count = 0
    while (ids.has(`${base}${count}`)) count++
    ids.add(`${base}${count}`)
    return `${base}${count}`
}

/**
 * Builds a function that reads down to the value and copies each level that differs. The function
 * takes the new value for `setPath`, and a function that maps the value for `mapPath`.
 */
function compile(name: string, kind: PathKind, keys: string[]): string {
    const last = keys.length - 1
    // t0 is the first level, the value itself is the last one read.
    const levels = keys.map((_, index) => `t${index}`)
    const parent = (index: number): string => index === 0 ? "t" : levels[index - 1]!
    const reads = keys.map((key, index) => `${levels[index]} = ${parent(index)}${access(key)}`).join(", ")

    let copy = "v"
    for (let index = last; index >= 0; index--) copy = `{ ...${parent(index)}, ${property(keys[index]!)}: ${copy} }`

    const current = levels[last]!
    if (kind === "mapPath") {
        return [
            `function ${name}(t, f) {`,
            `    const ${reads}`,
            `    const v = f(${current})`,
            `    if (Object.is(${current}, v)) return t`,
            `    return ${copy}`,
            `}`,
        ].join("\n")
    }
    return [
        `function ${name}(t, v) {`,
        `    const ${reads}`,
        // Object.is, as everywhere else: V8 compares objects with === several times slower.
        `    if (Object.is(${current}, v)) return t`,
        `    return ${copy}`,
        `}`,
    ].join("\n")
}

export function access(key: string): string {
    return isIdentifier(key) ? `.${key}` : `[${JSON.stringify(key)}]`
}

export function property(key: string): string {
    return isIdentifier(key) ? key : JSON.stringify(key)
}

export function isIdentifier(key: string): boolean {
    return /^[a-z_$][\w$]*$/i.test(key)
}
