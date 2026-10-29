import type { Node } from "oxc-parser"
import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { isReferenceIdentifier, ScopeTracker, walk } from "oxc-walker"
import { expressions, importEnd } from "./globals"

type ImportDeclaration = Extract<Node, { type: "ImportDeclaration" }>

/**
 * Replaces the messages and groups of `m` from `@monstermann/stdlib-i18n` with direct imports of
 * them, so only the messages that are used end up in a bundle:
 *
 * ```ts
 * import { m } from "#app/i18n";
 * t(m.auth.signIn);
 * ```
 *
 * ```ts
 * import { _authSignIn } from "#app/i18n/_messages";
 * t(_authSignIn);
 * ```
 *
 * `m` is imported from the folder stdlib-i18n generates, or from its `index`. Anything else done
 * with `m`, such as `m[key]`, would bundle every message, and throws. So does a group such as
 * `m.auth`, when bundling: there is no `_auth` to import.
 *
 * Returns `undefined` when there is nothing to replace.
 */
export function transformMessages(code: string, filePath: string): MagicString | undefined {
    // import { m } from …, import { m as messages } from …
    if (!/\bimport\s*\{[^}]*\bm\b/.test(code)) return

    const { program } = parseSync(filePath, code)
    const declarations = new Map<Node, ImportDeclaration>()
    for (const node of program.body) {
        if (node.type !== "ImportDeclaration" || node.importKind === "type" || !messagesOf(node.source.value)) continue
        for (const specifier of node.specifiers) {
            if (specifier.type !== "ImportSpecifier" || specifier.importKind === "type") continue
            const name = specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value
            if (name === "m") declarations.set(specifier, node)
        }
    }
    if (!declarations.size) return

    const ids = new Set<string>()
    const scopeTracker = new ScopeTracker({ preserveExitedScopes: true })
    walk(program, {
        scopeTracker,
        enter(node) {
            if (node.type === "Identifier") ids.add(node.name)
        },
    })
    scopeTracker.freeze()

    /** The import of `m` that an identifier refers to. */
    const importOf = (node: Node): Node | undefined => {
        if (node.type !== "Identifier") return
        const declaration = scopeTracker.getDeclaration(node.name)
        if (declaration?.type !== "Import" || !declarations.has(declaration.node)) return
        return declaration.node
    }

    const ms = new MagicString(code, { filename: filePath })
    const aliases = new Map<string, string>()
    const imports = new Map<ImportDeclaration, string[]>()

    const alias = (specifier: Node, name: string): string => {
        const declaration = declarations.get(specifier)!
        const path = messagesOf(declaration.source.value)!
        const key = `${path} ${name}`
        let local = aliases.get(key)
        if (local) return local
        for (let count = 0; ids.has(local = `${name}${count || ""}`); count++);
        ids.add(local)
        aliases.set(key, local)
        const list = imports.get(declaration) ?? []
        list.push(local === name ? name : `${name} as ${local}`)
        imports.set(declaration, list)
        return local
    }

    walk(program, {
        scopeTracker,
        enter(node, parent) {
            if (node.type === "ImportDeclaration") return this.skip()
            // typeof m
            if (node.type.startsWith("TS") && !expressions.has(node.type)) return this.skip()

            if (node.type === "Identifier") {
                if (importOf(node) && isReferenceIdentifier(node, parent)) throw unsupported(filePath, code, node)
                return
            }

            // m.auth.signIn, m.auth: the members up to `m`, all written out.
            if (node.type !== "MemberExpression" || isWritten(node, parent)) return
            const path: string[] = []
            let object: Node = node
            while (object.type === "MemberExpression" && !object.computed && object.property.type === "Identifier") {
                path.unshift(object.property.name)
                object = object.object
            }
            if (object.type !== "Identifier") return
            // m[key].signIn is left to the members inside of it.
            const specifier = importOf(object)
            if (!specifier) return

            ms.overwrite(node.start, node.end, alias(specifier, nameOf(path)))
            this.skip()
        },
    })

    if (!ms.hasChanged()) return

    // Each import stays on its line, for the lines after it to stay where they are.
    for (const [declaration, list] of imports) {
        const rest = declaration.specifiers.filter((specifier) => !declarations.has(specifier))
        const from = declaration.source.value
        const statements = [`import { ${list.join(", ")} } from ${JSON.stringify(messagesOf(from))};`]
        const original = code.slice(declaration.start, importEnd(declaration, code))
        if (rest.length === declaration.specifiers.length) statements.unshift(original.endsWith(";") ? original : `${original};`)
        else if (rest.length) statements.unshift(`import { ${rest.map((specifier) => code.slice(specifier.start, specifier.end)).join(", ")} } from ${JSON.stringify(from)};`)
        ms.overwrite(declaration.start, importEnd(declaration, code), statements.join(" "))
    }

    return ms
}

/**
 * Where the messages of a folder that stdlib-i18n generated are: `#app/i18n`, `./i18n/index.ts`.
 * Nothing for a file, such as Paraglide's `./paraglide/messages.js`.
 */
function messagesOf(path: string): string | undefined {
    const trimmed = path.replace(/\/$/, "")
    const index = /\/index(\.[cm]?[jt]sx?)?$/.exec(trimmed)
    if (index) return `${trimmed.slice(0, index.index)}/_messages${index[1] ?? ""}`
    if (/\.[^./]+$/.test(trimmed.slice(trimmed.lastIndexOf("/") + 1))) return
    return `${trimmed}/_messages`
}

/** `_authSignIn` for `auth.signIn`, the way stdlib-i18n names its exports. */
function nameOf(path: string[]): string {
    return `_${path.map((segment, i) => i ? segment.charAt(0).toUpperCase() + segment.slice(1) : segment).join("")}`
}

function unsupported(filePath: string, code: string, node: Node): Error {
    const line = code.slice(0, node.start).split("\n").length
    return new Error(`${filePath}:${line}: m can only be used as m.auth.signIn, anything else would bundle every message`)
}

/** m.auth = …, delete m.auth, m.count++ */
function isWritten(node: Node, parent: Node | null): boolean {
    if (!parent) return false
    if (parent.type === "AssignmentExpression") return parent.left === node
    if (parent.type === "UpdateExpression") return true
    if (parent.type === "UnaryExpression") return parent.operator === "delete"
    return false
}
