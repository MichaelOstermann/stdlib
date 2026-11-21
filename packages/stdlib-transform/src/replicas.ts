import type { ImportDeclaration, ImportSpecifier, Node } from "oxc-parser"
import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { ScopeTracker, walk } from "oxc-walker"
import { expressions, importEnd } from "./syntax"

export interface ReplicasOptions {
    /**
     * The functions on each replica: `{ Array: ["removeAll"] }` makes `Array.removeAll` something
     * to replace.
     */
    replicas: Readonly<Record<string, readonly string[]>>
    /** Where a function is imported from, it is exported there under its own name. */
    resolve: (replica: string, name: string) => string
    /** Where a replica is imported from: `import { Set } from "@monstermann/stdlib"` */
    sources: (replica: string) => readonly string[]
}

interface Replica {
    declaration: ImportDeclaration
    name: string
}

/** Operators that compare a replica as it is, which only the native one is equal to. */
const comparisons = new Set(["===", "!==", "==", "!="])

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

/**
 * Replaces the functions of replicas, the natives with functions added, with direct imports:
 *
 * ```ts
 * import { Array } from "@monstermann/stdlib";
 * Array.removeAll(values, [1, 2]);
 * ```
 *
 * ```ts
 * import { removeAll as _removeAll } from "@monstermann/stdlib/Array/removeAll";
 * _removeAll(values, [1, 2]);
 * ```
 *
 * The import of a replica is removed when every use that remains works with the native one as well:
 * `new Set()`, `x instanceof Set`, `Set.groupBy()`. Every other use keeps it: `call(Set)`,
 * `Set["union"]`. Imports are added to an existing line, so every line stays where it is.
 *
 * Returns `undefined` when there is nothing to replace.
 */
export function transformReplicas(code: string, filePath: string, options: ReplicasOptions): MagicString | undefined {
    const { program } = parseSync(filePath, code)
    const replicas = findReplicas(program.body, options)
    if (!replicas.size) return

    const ms = new MagicString(code, { filename: filePath })
    const ids = new Set<string>()
    const aliases = new Map<string, string>()
    const imports: string[] = []
    const kept = new Set<ImportSpecifier>()

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

    /** The import of a replica that something refers to: `Set`, `(Set)`, `Set!` */
    const replicaOf = (node: Node | null | undefined): ImportSpecifier | undefined => {
        while (node && wrappers.has(node.type)) node = (node as { expression: Node }).expression
        if (node?.type !== "Identifier") return
        const declaration = scopeTracker.getDeclaration(node.name)
        if (declaration?.type !== "Import" || declaration.node.type !== "ImportSpecifier") return
        return replicas.has(declaration.node) ? declaration.node : undefined
    }

    /**
     * new Set(), x instanceof Set, Set(), Set.groupBy, x.constructor === Set: what the native one
     * can do as well.
     */
    const isNativeUse = (node: Node): boolean => {
        let child = node
        let parent = parents.get(node)
        while (parent && wrappers.has(parent.type)) {
            child = parent
            parent = parents.get(parent)
        }
        if (!parent) return false
        if (parent.type === "MemberExpression") return parent.object === child && !parent.computed
        if (parent.type === "NewExpression" || parent.type === "CallExpression") return parent.callee === child
        if (parent.type === "BinaryExpression" && parent.operator === "instanceof") return parent.right === child
        if (parent.type === "BinaryExpression") return comparisons.has(parent.operator)
        return false
    }

    /** Set.union = …, delete Set.union, [Set.union] = … */
    const isWritten = (node: Node, parent: Node | null): boolean => {
        if (!parent) return false
        if (parent.type === "AssignmentExpression" || parent.type === "AssignmentPattern") return parent.left === node
        if (parent.type === "UpdateExpression" || parent.type === "ArrayPattern" || parent.type === "RestElement") return true
        if (parent.type === "UnaryExpression") return parent.operator === "delete"
        if (parent.type === "Property") return parent.value === node && parents.get(parent)?.type === "ObjectPattern"
        return false
    }

    const alias = (replica: string, name: string): string => {
        const key = `${replica}.${name}`
        let local = aliases.get(key)
        if (local) return local
        // Map.delete and Set.delete are different files.
        for (let count = 0; ids.has(local = `_${name}${count || ""}`); count++);
        ids.add(local)
        aliases.set(key, local)
        imports.push(`import { ${name} as ${local} } from ${JSON.stringify(options.resolve(replica, name))};`)
        return local
    }

    walk(program, {
        scopeTracker,
        enter(node, parent) {
            if (node.type === "ImportDeclaration") return this.skip()
            // export { Set } from "./set"
            if ((node.type === "ExportNamedDeclaration" || node.type === "ExportAllDeclaration") && node.source) return this.skip()
            // Types are not replaced, they are known without an import.
            if (node.type.startsWith("TS") && !expressions.has(node.type)) return this.skip()

            // call(Set), export { Set }, const { union } = Set
            if (node.type === "Identifier" && !isName(node, parent)) {
                const specifier = replicaOf(node)
                if (specifier && !isNativeUse(node)) kept.add(specifier)
                return
            }

            if (node.type !== "MemberExpression") return
            const specifier = replicaOf(node.object)
            if (!specifier) return

            const replica = replicas.get(specifier)!.name
            const name = keyOf(node.property, node.computed)
            if (name === undefined || !options.replicas[replica]!.includes(name)) return

            // Set["union"], Set.union = …
            if (node.computed || isWritten(node, parent)) {
                kept.add(specifier)
                return
            }

            ms.overwrite(node.start, node.end, alias(replica, name))
            this.skip()
        },
    })

    removeSpecifiers(ms, code, [...replicas].filter(([specifier]) => !kept.has(specifier)))
    if (!ms.hasChanged()) return

    // Directives need to stay the first thing in a file.
    const first = program.body.find((node) => node.type !== "ExpressionStatement" || !node.directive)
    if (imports.length) ms.appendLeft(first?.start ?? code.length, imports.join(""))

    return ms
}

/** The imports of replicas: `import { Set } from "@monstermann/stdlib"` */
function findReplicas(statements: Node[], options: ReplicasOptions): Map<ImportSpecifier, Replica> {
    const replicas = new Map<ImportSpecifier, Replica>()
    for (const node of statements) {
        if (node.type !== "ImportDeclaration" || node.importKind === "type") continue
        for (const specifier of node.specifiers) {
            if (specifier.type !== "ImportSpecifier" || specifier.importKind === "type") continue
            const name = specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value
            if (!Object.hasOwn(options.replicas, name)) continue
            if (options.sources(name).includes(node.source.value)) replicas.set(specifier, { declaration: node, name })
        }
    }
    return replicas
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
 * Whether an identifier is the name of something, instead of referring to something: `a.name`,
 * `{ name: a }`, `name: for (…)`
 */
function isName(node: Node, parent: Node | null): boolean {
    if (!parent) return false
    if (parent.type === "MemberExpression") return parent.property === node && !parent.computed
    if (parent.type === "Property") return parent.key === node && !parent.computed && !parent.shorthand
    if (parent.type === "MethodDefinition" || parent.type === "PropertyDefinition" || parent.type === "AccessorProperty") return parent.key === node && !parent.computed
    if (parent.type === "LabeledStatement" || parent.type === "BreakStatement" || parent.type === "ContinueStatement") return true
    // export { Set as S }: `Set` is a reference, `S` is only a name.
    if (parent.type === "ExportSpecifier") return parent.local !== node
    if (parent.type === "TSEnumMember" || parent.type === "TSEnumDeclaration" || parent.type === "TSModuleDeclaration") return parent.id === node
    if (parent.type === "ImportSpecifier" || parent.type === "ImportAttribute") return true
    return false
}

/** Removes the imports of `replicas`, and an import that has nothing left as a whole. */
function removeSpecifiers(ms: MagicString, code: string, replicas: [ImportSpecifier, Replica][]): void {
    const declarations = new Map<ImportDeclaration, ImportSpecifier[]>()
    for (const [specifier, { declaration }] of replicas) declarations.set(declaration, [...declarations.get(declaration) ?? [], specifier])
    for (const [declaration, removed] of declarations) {
        const remaining = declaration.specifiers.filter((specifier) => !removed.includes(specifier as ImportSpecifier))
        if (!remaining.length) {
            ms.remove(declaration.start, importEnd(declaration, code))
            continue
        }
        const first = declaration.specifiers[0]!
        const last = declaration.specifiers.at(-1)!
        ms.overwrite(first.start, last.end, remaining.map((specifier) => code.slice(specifier.start, specifier.end)).join(", "))
    }
}
