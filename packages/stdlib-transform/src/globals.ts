import type { Node } from "oxc-parser"
import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { ScopeTracker, walk } from "oxc-walker"

export interface GlobalsOptions {
    /**
     * The members declared on each global: `{ Array: ["removeAll"] }` makes `Array.removeAll`
     * something to replace.
     */
    globals: Readonly<Record<string, readonly string[]>>
    /** Files that only exist for running the code untransformed. Imports of them are removed. */
    guards: readonly string[]
    /**
     * Globals that are values themselves, and where each one is imported from:
     * `{ pipe: "@monstermann/stdlib/pipe.mjs" }`
     */
    values?: Readonly<Record<string, string>>
    /** Where a member is imported from, it is exported there under its own name. */
    resolve: (global: string, name: string) => string
}

/** Nodes of TypeScript that contain code, every other one is about types. */
const expressions = new Set([
    "TSAsExpression",
    "TSEnumBody",
    "TSEnumDeclaration",
    "TSEnumMember",
    "TSExportAssignment",
    "TSInstantiationExpression",
    "TSModuleBlock",
    "TSModuleDeclaration",
    "TSNonNullExpression",
    "TSParameterProperty",
    "TSSatisfiesExpression",
    "TSTypeAssertion",
])

/**
 * Syntax that wraps an expression without changing its value: `(Array)`, `Array!`, `Array as any`
 */
const wrappers = new Set([
    "ParenthesizedExpression",
    "TSAsExpression",
    "TSNonNullExpression",
    "TSSatisfiesExpression",
    "TSTypeAssertion",
])

const mentions = new WeakMap<GlobalsOptions["globals"], (code: string) => boolean>()

/**
 * Replaces the members declared on globals with direct imports, the globals themselves are never
 * touched:
 *
 * ```ts
 * import "@monstermann/stdlib/globals";
 * Array.removeAll(values, [1, 2]);
 * ```
 *
 * ```ts
 * import { removeAll as _removeAll } from "@monstermann/stdlib/Array/removeAll.mjs";
 * _removeAll(values, [1, 2]);
 * ```
 *
 * A global that is a value itself (`pipe`, `Duration`) is imported under its own name.
 *
 * A global that has been declared in the file is something else, and left alone. Imports are added
 * to an existing line, so every line stays where it is.
 *
 * Returns `undefined` when there is nothing to replace.
 */
export function transformGlobals(code: string, filePath: string, options: GlobalsOptions): MagicString | undefined {
    // Nothing to do when nothing is mentioned, skip parsing.
    if (!options.guards.some((guard) => code.includes(guard)) && !mentioned(options)(code)) return

    const { program } = parseSync(filePath, code)
    const ms = new MagicString(code, { filename: filePath })
    const ids = new Set<string>()
    const aliases = new Map<string, string>()
    const imports: string[] = []
    const values = options.values ?? {}
    const used = new Set<string>()

    // Collects all declarations, including hoisted ones, to tell what a name refers to where it is used.
    const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
    const parents = new Map<Node, Node | null>()
    walk(program, {
        scopeTracker,
        enter(node, parent) {
            parents.set(node, parent)
            if (node.type === "Identifier") ids.add(node.name)
        },
    })
    scopeTracker.freeze()

    /**
     * Something that exists when the code runs, once it has been imported: `Duration`, unlike
     * `Array.removeAll`.
     */
    const isValue = (global: string): boolean => Object.hasOwn(values, global)

    const has = (global: string, name: string): boolean => {
        return options.globals[global]!.includes(name)
    }

    /**
     * The global that something is, when it has not been declared in the file: `Array`, `(Array)`,
     * `Array!`
     */
    const globalOf = (node: Node | null | undefined): string | undefined => {
        while (node && wrappers.has(node.type)) node = (node as { expression: Node }).expression
        if (node?.type !== "Identifier" || !Object.hasOwn(options.globals, node.name)) return
        return scopeTracker.getDeclaration(node.name) ? undefined : node.name
    }

    /** const { removeAll } = Array */
    const rejectPattern = (pattern: Node, source: Node | null | undefined): void => {
        if (pattern.type !== "ObjectPattern") return
        const global = globalOf(source)
        if (!global || isValue(global)) return
        for (const property of pattern.properties) {
            if (property.type !== "Property") continue
            const name = keyOf(property.key, property.computed)
            if (name !== undefined && has(global, name)) throw unsupported(filePath, global, name)
        }
    }

    /** Array.removeAll = …, delete Array.removeAll, [Array.removeAll] = … */
    const isWritten = (node: Node, parent: Node | null): boolean => {
        if (!parent) return false
        if (parent.type === "AssignmentExpression" || parent.type === "AssignmentPattern") return parent.left === node
        if (parent.type === "UpdateExpression" || parent.type === "ArrayPattern" || parent.type === "RestElement") return true
        if (parent.type === "UnaryExpression") return parent.operator === "delete"
        if (parent.type === "Property") return parent.value === node && parents.get(parent)?.type === "ObjectPattern"
        return false
    }

    const alias = (global: string, name: string): string => {
        const key = `${global}.${name}`
        let local = aliases.get(key)
        if (local) return local
        // Map.delete and Set.delete are different files.
        for (let count = 0; ids.has(local = `_${name}${count || ""}`); count++);
        ids.add(local)
        aliases.set(key, local)
        imports.push(`import { ${name} as ${local} } from ${JSON.stringify(options.resolve(global, name))};`)
        return local
    }

    walk(program, {
        scopeTracker,
        enter(node, parent) {
            if (node.type === "ImportDeclaration") {
                // The line is kept, for the ones after it to stay where they are.
                if (options.guards.includes(node.source.value) && !node.specifiers.length) ms.remove(node.start, importEnd(node, code))
                return this.skip()
            }

            // export { pipe } from "./pipe", export * as Duration from "./duration"
            if ((node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") && node.source) return this.skip()

            if (node.type === "VariableDeclarator") rejectPattern(node.id, node.init)
            else if (node.type === "AssignmentExpression" || node.type === "AssignmentPattern") rejectPattern(node.left, node.right)

            // Types are not replaced, they are known without an import.
            if (node.type.startsWith("TS") && !expressions.has(node.type)) return this.skip()

            // pipe(…), call(Duration)
            if (node.type === "Identifier" && Object.hasOwn(values, node.name) && !isName(node, parent) && !scopeTracker.getDeclaration(node.name)) {
                used.add(node.name)
                return
            }

            if (node.type !== "MemberExpression") return
            const global = globalOf(node.object)
            if (!global) return

            const name = keyOf(node.property, node.computed)
            if (name === undefined || !has(global, name)) return

            // Array["removeAll"], Array.removeAll = …
            if (node.computed || isWritten(node, parent)) {
                // An object that exists is imported as a whole.
                if (isValue(global)) return
                throw unsupported(filePath, global, name)
            }

            ms.overwrite(node.start, node.end, alias(global, name))
            this.skip()
        },
    })

    for (const name of used) imports.push(`import { ${name} } from ${JSON.stringify(values[name])};`)
    if (!ms.hasChanged() && !imports.length) return

    // Directives need to stay the first thing in a file.
    const first = program.body.find((node) => node.type !== "ExpressionStatement" || !node.directive)
    if (imports.length) ms.appendLeft(first?.start ?? code.length, imports.join(""))

    return ms
}

/**
 * Tells whether a file is worth parsing: something that is a global of its own is mentioned, or a
 * global together with something that is available on it, wherever and however that is written.
 */
function mentioned(options: GlobalsOptions): (code: string) => boolean {
    let result = mentions.get(options.globals)
    if (result) return result
    const values = Object.keys(options.values ?? {})
    const anything = values.length ? new RegExp(`\\b(?:${values.join("|")})\\b`) : undefined
    const members = Object.entries(options.globals).map(([global, names]) => [new RegExp(`\\b${global}\\b`), new RegExp(`\\b(?:${names.join("|")})\\b`)] as const)
    result = (code) => !!anything?.test(code) || members.some(([global, names]) => global.test(code) && names.test(code))
    mentions.set(options.globals, result)
    return result
}

/**
 * The name a key stands for, when that is known without running the code: `a.name`, `a["name"]`,
 * ``a[`name`]``
 */
function keyOf(key: Node, computed: boolean): string | undefined {
    if (!computed) return key.type === "Identifier" ? key.name : undefined
    if (key.type === "Literal") return typeof key.value === "string" ? key.value : undefined
    if (key.type === "TemplateLiteral" && !key.expressions.length) return key.quasis[0]?.value.cooked ?? undefined
    return undefined
}

/**
 * Where an import ends. Without a semicolon it is taken to reach up to one that starts a later
 * line, removing that would move the lines in between.
 */
export function importEnd(node: Extract<Node, { type: "ImportDeclaration" }>, code: string): number {
    if (node.attributes.length) return node.end
    const end = node.source.end
    return code[end] === ";" ? end + 1 : end
}

/**
 * Whether an identifier is the name of something, instead of referring to something: `a.name`,
 * `{ name: a }`, `name: for (…)`
 */
function isName(node: Node, parent: Node | null): boolean {
    if (!parent) return false
    if (parent.type === "MemberExpression") return parent.property === node && !parent.computed
    if (parent.type === "Property") return parent.key === node && !parent.computed && !parent.shorthand
    if (parent.type === "MethodDefinition" || parent.type === "PropertyDefinition" || parent.type === "AccessorProperty") return parent.key === node && !parent.computed
    if (parent.type === "LabeledStatement" || parent.type === "BreakStatement" || parent.type === "ContinueStatement") return true
    // export { pipe as p }: `pipe` is a reference, `p` is only a name.
    if (parent.type === "ExportSpecifier") return parent.local !== node
    if (parent.type === "TSEnumMember" || parent.type === "TSEnumDeclaration" || parent.type === "TSModuleDeclaration") return parent.id === node
    if (parent.type === "ImportSpecifier" || parent.type === "ImportAttribute") return true
    return false
}

function unsupported(filePath: string, global: string, name: string): Error {
    return new Error(`${filePath}: ${global}.${name} does not exist when the code runs, it can only be used as it is written here: ${global}.${name}`)
}
