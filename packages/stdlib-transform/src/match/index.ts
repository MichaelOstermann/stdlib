import type { ImportDeclaration, Node } from "oxc-parser"
import type { Context, Helpers } from "./types"
import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { ScopeTracker, walk } from "oxc-walker"
import { collectChain } from "./collectChain"
import { compileChain } from "./compileChain"
import { collectTag, compileTag } from "./compileTag"
import { AbortError } from "./helpers"

export type { Helpers } from "./types"

export interface MatchResult {
    ms: MagicString
    /** Imports that are no longer referenced, because every use has been compiled away: `match`, `_` */
    unused: string[]
}

interface Imported {
    /** How often it has been imported, not at all when it is the global. */
    count: number
    local: string
    node: ImportDeclaration | undefined
}

/**
 * Compiles `match(value).case(…).shape(…).unwrapOr(…)` chains into conditional expressions:
 *
 * ```ts
 * match(value).case(1, 2, "few").onShape({ type: "a" }, v => v.id).unwrapOr("other")
 * ```
 *
 * ```ts
 * (((value === (1)) || (value === (2))) ? ("few")
 * : (typeof value === "object" && value !== null && value.type === ("a")) ? (value.id)
 * : ("other"))
 * ```
 *
 * `match.tag(value, "type", { a: v => v.id, _: () => 0 })` is compiled the same way:
 *
 * ```ts
 * (value.type === "a" ? (value.id)
 * : (0))
 * ```
 *
 * Chains inside of the callbacks of another chain are compiled in a later run.
 * `helpers` carries the helper imports that already exist from one run to the next.
 *
 * Returns `undefined` when `match` has not been imported from `from`.
 */
export function transformMatches(code: string, filePath: string, from: string, helpers: Helpers = {}): MatchResult | undefined {
    const { program } = parseSync(filePath, code)
    // Without an import, `match` is the global, which a declaration of that name in the file is not.
    const match = findImport(program.body, from, "match") ?? { count: 0, local: "match", node: undefined }
    const wildcard = findImport(program.body, from, "_")

    let ids: Set<string> | undefined
    let transformed = 0
    const references = { _: 0, match: 0 }
    const added: (keyof Helpers)[] = []

    // Collects all declarations, including hoisted ones, to tell what a name refers to where it is used.
    const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
    const parents = new Map<Node, Node | null>()
    const assigned = new Set<string>()
    walk(program, {
        scopeTracker,
        enter(node, parent) {
            parents.set(node, parent)
            if (node.type === "AssignmentExpression") collectTargets(node.left, assigned)
            else if (node.type === "UpdateExpression") collectTargets(node.argument, assigned)
            else if (node.type === "ForInStatement" || node.type === "ForOfStatement") collectTargets(node.left, assigned)
        },
    })
    scopeTracker.freeze()

    const ctx: Context = {
        code,
        filePath,
        helpers,
        match: match.local,
        ms: new MagicString(code, { filename: filePath }),
        used: { _: 0, match: 0 },
        wildcard: wildcard?.local,
        helper(name: keyof Helpers): string {
            if (!helpers[name]) {
                helpers[name] = this.id(name)
                added.push(name)
            }
            return helpers[name]
        },
        id(base: string): string {
            let count = 0
            const ids = this.ids
            while (ids.has(`${base}${count}`)) {
                count++
            }
            ids.add(`${base}${count}`)
            return `${base}${count}`
        },
        get ids() {
            if (ids) return ids
            ids = new Set<string>()
            walk(program, {
                enter(node) {
                    if (node.type !== "Identifier") return
                    ids!.add(node.name)
                },
            })
            return ids
        },
        isImport(name: string): boolean {
            return scopeTracker.getDeclaration(name)?.type === "Import"
        },
        isStable(name: string): boolean {
            const declaration = scopeTracker.getDeclaration(name)
            // Globals and imports can be reassigned from other modules.
            if (!declaration || declaration.type === "Import") return false
            if (declaration.type === "Variable" && declaration.variableNode.kind === "const") return true
            return !assigned.has(name)
        },
    }

    const count = (node: Node, by: -1 | 1): void => {
        references.match += by * countReferences(node, match.local)
        if (wildcard) references._ += by * countReferences(node, wildcard.local)
    }

    walk(program, {
        scopeTracker,
        enter(node, parent) {
            if (node.type === "ImportDeclaration") return this.skip()
            if (node.type === "Identifier" && !isPropertyName(node, parent)) {
                if (node.name === match.local) references.match++
                else if (node.name === wildcard?.local) references._++
            }

            const chain = collectChain(node, match.local)
            const tag = chain ? undefined : collectTag(node, match.local)
            if (!chain && !tag) return
            // Something else that is called the same: function run(match) { match(value)… }
            if (match.node ? !ctx.isImport(match.local) : scopeTracker.getDeclaration(match.local)) return

            const known = added.length
            ctx.used = { _: 0, match: 0 }
            try {
                const result = chain ? compileChain(node, chain, ctx) : compileTag(node, tag!, ctx)
                ctx.ms.overwrite(node.start, node.end, startsStatement(node, parents) ? `;${result}` : result)
            }
            catch (error) {
                // Drop the helpers requested by a chain that is left uncompiled.
                for (const name of added.splice(known)) delete helpers[name]
                if (error instanceof AbortError) return
                throw error
            }

            transformed++
            // The whole chain has been replaced without visiting its children: references to the imports inside of it remain.
            count(node, 1)
            references.match -= 1 + ctx.used.match
            references._ -= ctx.used._
            this.skip()
        },
    })

    // Without an import to put them next to, they are added to an existing line, so every line stays where it is.
    const first = program.body.find((node) => node.type !== "ExpressionStatement" || !node.directive)
    for (const name of added) {
        const helper = `import { ${name} as ${helpers[name]} } from "${from}/internals/match/${name}.mjs";`
        if (match.node) ctx.ms.appendLeft(match.node.end, `\n${helper}`)
        else ctx.ms.appendLeft(first?.start ?? code.length, helper)
    }

    // Dropping an import by its name would drop the others of that name.
    const unused: string[] = []
    if (transformed && !references.match && match.count === 1) unused.push("match")
    if (transformed && !references._ && wildcard?.count === 1) unused.push("_")
    return { ms: ctx.ms, unused }
}

/** `import { match as foo } from "from"` → `"foo"`, chains of the first one are compiled when there are several. */
function findImport(statements: Node[], from: string, name: string): Imported | undefined {
    let result: Imported | undefined
    for (const node of statements) {
        if (node.type !== "ImportDeclaration" || node.importKind === "type" || node.source.value !== from) continue
        for (const specifier of node.specifiers) {
            if (specifier.type !== "ImportSpecifier" || specifier.importKind === "type") continue
            if (specifier.imported.type !== "Identifier" || specifier.imported.name !== name) continue
            if (result) result.count++
            else result = { count: 1, local: specifier.local.name, node }
        }
    }
    return result
}

/**
 * Whether what a chain is replaced with is the start of a statement that follows another one,
 * which it would be read as a call of when that one does not end with a semicolon.
 */
export function startsStatement(node: Node, parents: Map<Node, Node | null>): boolean {
    for (let parent = parents.get(node); parent; parent = parents.get(parent)) {
        if (parent.start !== node.start) return false
        if (parent.type !== "ExpressionStatement") continue
        const list = parents.get(parent)
        // Not what an `if` or a loop is followed by, which a semicolon would end.
        return !list || list.type === "Program" || list.type === "BlockStatement" || list.type === "StaticBlock" || list.type === "SwitchCase" || list.type === "TSModuleBlock"
    }
    return false
}

/** The names that are assigned to: `a = 1`, `[a, { b }] = c`, `a++`, `for (a of b)` */
export function collectTargets(node: Node, names: Set<string>): void {
    if (node.type === "Identifier") names.add(node.name)
    else if (node.type === "ArrayPattern") node.elements.forEach((element) => element && collectTargets(element, names))
    else if (node.type === "ObjectPattern") node.properties.forEach((property) => collectTargets(property.type === "Property" ? property.value : property, names))
    else if (node.type === "AssignmentPattern") collectTargets(node.left, names)
    else if (node.type === "RestElement") collectTargets(node.argument, names)
    else if (node.type === "ParenthesizedExpression" || node.type === "TSAsExpression" || node.type === "TSNonNullExpression" || node.type === "TSSatisfiesExpression" || node.type === "TSTypeAssertion") collectTargets(node.expression, names)
}

function isPropertyName(node: Node, parent: Node | null): boolean {
    if (parent?.type === "MemberExpression") return parent.property === node && !parent.computed
    if (parent?.type === "Property") return parent.key === node && !parent.computed && !parent.shorthand
    return false
}

function countReferences(node: Node, local: string): number {
    let count = 0
    walk(node, {
        enter(node, parent) {
            if (node.type === "Identifier" && node.name === local && !isPropertyName(node, parent)) count++
        },
    })
    return count
}
