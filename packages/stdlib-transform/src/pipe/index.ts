import type { Expression, ImportDeclaration, Node } from "oxc-parser"
import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { ScopeTracker, walk } from "oxc-walker"
import { collectTargets, startsStatement } from "../match"
import { unwrap } from "../match/helpers"
import { inline, isFunction, isPropertyName } from "../match/transformCallback"

export interface PipeResult {
    /** How often `pipe` has been imported, not at all when it is the global. */
    imports: number
    ms: MagicString
    /** How often `pipe` is still referred to, calls that have been replaced aside. */
    references: number
}

/** The code of the value that is passed from one step to the next. */
interface Value {
    code: string
    /** Can be placed anywhere without parentheses: `a`, `a.b`, `a(b)`, `1` */
    isAtom: boolean
    /**
     * Can be written any number of times, anywhere: a literal, or a name that always refers to the
     * same value.
     */
    isSimple: boolean
}

/**
 * Turns `pipe()` calls into the calls they make:
 *
 * ```ts
 * pipe(tasks, tasks => Array.removeAll(tasks, done), tasks => tasks.length, format)
 * ```
 *
 * ```ts
 * format(Array.removeAll(tasks, done).length)
 * ```
 *
 * A callback is replaced with its body when its parameter is used once, as the first thing the body
 * evaluates, or when the value is a literal or a name that is never assigned to. Every other
 * callback is called directly: `(v => v + v)(value)`.
 *
 * A call is kept when one of its steps is neither a function nor the name of one
 * (`pipe(a, create())`): it would be created after the value instead of before.
 *
 * Calls inside of the steps of another call are left for another run.
 */
export function transformPipes(code: string, filePath: string, from: string): PipeResult {
    const { program } = parseSync(filePath, code)
    // Without an import, `pipe` is the global, which a declaration of that name in the file is not.
    const pipe = findImport(program.body, from)
    const local = pipe?.local ?? "pipe"
    const ms = new MagicString(code, { filename: filePath })
    let references = 0

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

    const isStable = (name: string): boolean => {
        const declaration = scopeTracker.getDeclaration(name)
        // Globals and imports can be reassigned from other modules.
        if (!declaration || declaration.type === "Import") return false
        if (declaration.type === "Variable" && declaration.variableNode.kind === "const") return true
        return !assigned.has(name)
    }

    walk(program, {
        scopeTracker,
        enter(node, parent) {
            if (node.type === "ImportDeclaration") return this.skip()
            if (node.type === "Identifier" && node.name === local && !isPropertyName(node, parent)) references++

            if (node.type !== "CallExpression" || node.optional || node.callee.type !== "Identifier" || node.callee.name !== local) return
            // Something else that is called the same: function run(pipe) { pipe(value) }
            const declaration = scopeTracker.getDeclaration(local)
            if (pipe ? declaration?.type !== "Import" : declaration) return

            const [first, ...steps] = node.arguments
            if (!first || node.arguments.some((argument) => argument.type === "SpreadElement")) return
            if (!steps.every(isStep)) return

            let value: Value = {
                code: code.slice(first.start, first.end),
                isAtom: isAtom(first),
                isSimple: isLiteral(first) || (first.type === "Identifier" && isStable(first.name)),
            }
            for (const step of steps) value = apply(value, unwrap(step), code)

            const result = value.isAtom ? value.code : `(${value.code})`
            // Anything but a name would be read as a part of the statement before, when that one has no semicolon.
            ms.overwrite(node.start, node.end, startsStatement(node, parents) && !/^[\w$]/.test(result) ? `;${result}` : result)
            // The whole call has been replaced without visiting its children: references inside of it remain, except the one that was just compiled.
            this.skip()
            references += countReferences(node, local) - 1
        },
    })

    return { imports: pipe?.count ?? 0, ms, references }
}

/**
 * What can be called after the value has been evaluated instead of before, without that being
 * noticed.
 */
function isStep(node: Node): boolean {
    node = unwrap(node)
    return isFunction(node) || isPath(node)
}

/** `a`, `a.b.c` */
function isPath(node: Node): boolean {
    node = unwrap(node)
    if (node.type === "Identifier") return true
    return node.type === "MemberExpression" && !node.computed && !node.optional && isPath(node.object)
}

function isLiteral(node: Node): boolean {
    return node.type === "Literal" && !("regex" in node) && (node.value === null || typeof node.value !== "object")
}

function isAtom(node: Node): boolean {
    // 1.toFixed() is not a number followed by a property.
    if (node.type === "Literal") return typeof node.value !== "number"
    return node.type === "Identifier"
        || node.type === "ThisExpression"
        || node.type === "CallExpression"
        || node.type === "MemberExpression"
        || node.type === "ArrayExpression"
        || node.type === "TemplateLiteral"
        || node.type === "ParenthesizedExpression"
}

/**
 * Passes a value to a step, by replacing the parameter of the step with it where that is possible.
 */
function apply(value: Value, step: Node, code: string): Value {
    const source = code.slice(step.start, step.end)
    const argument = value.isAtom ? value.code : `(${value.code})`
    // A method is called without the object it belongs to, the same way it is when being passed along.
    const call: Value = {
        code: step.type === "Identifier" ? `${source}(${value.code})` : isFunction(step) ? `(${source})(${value.code})` : `(0, ${source})(${value.code})`,
        isAtom: true,
        isSimple: false,
    }

    // Functions have their own `this` and `arguments`, async functions return a promise.
    if (step.type !== "ArrowFunctionExpression" || step.async) return call
    const param = step.params[0]
    if (step.params.length !== 1 || param?.type !== "Identifier") return call

    let body: Expression | undefined
    if (step.body.type !== "BlockStatement") {
        body = step.body
    }
    else {
        // v => { return result }
        const statement = step.body.body[0]
        if (step.body.body.length === 1 && statement?.type === "ReturnStatement") body = statement.argument ?? undefined
    }
    if (!body) return call

    const result = (text: string | undefined): Value => text === undefined
        ? call
        : { code: text, isAtom: isAtom(body) && body.type !== "Identifier" && body.type !== "Literal", isSimple: false }

    if (value.isSimple) return result(inline(argument, param.name, body, { code }))

    // Anything else is evaluated where the parameter is, which has to be exactly when the step is called.
    if (countReferences(body, param.name) !== 1) return call
    const lead = findLead(body, param.name)
    if (!lead) return call

    const ms = new MagicString(code.slice(body.start, body.end))
    const { node, parent } = lead
    let text = lead.isCallee ? `(0, ${value.code})` : lead.isConstructed ? `(${value.code})` : argument
    // { v } → { v: value }
    if (parent?.type === "Property" && parent.shorthand) text = `${param.name}: ${value.code}`
    ms.overwrite(node.start - body.start, node.end - body.start, text)
    return result(ms.toString())
}

interface Lead {
    /** v(), which would be called as a method of what it has been taken off: a.b() */
    isCallee: boolean
    /** new v(), new v.a() */
    isConstructed: boolean
    node: Node
    parent: Node | undefined
}

/**
 * Finds where a parameter is used, when it is the first thing that happens, and always happens:
 * only names, properties and literals are read before it.
 */
function findLead(body: Node, param: string): Lead | undefined {
    let lead: Lead | undefined
    let isConstructed = false

    /**
     * Whether `node` has been dealt with: the parameter was found in there, or there is nothing in
     * there that could be noticed.
     */
    const visit = (node: Node | null, parent?: Node): "found" | "pure" | undefined => {
        if (!node) return "pure"
        switch (node.type) {
            case "Identifier": {
                if (node.name !== param) return "pure"
                lead = { isCallee: false, isConstructed, node, parent }
                return "found"
            }
            case "Literal":
            case "ThisExpression":
                return "pure"
            // Creating a function is not calling it.
            case "ArrowFunctionExpression":
            case "FunctionExpression":
                return "pure"
            case "ParenthesizedExpression":
            case "TSAsExpression":
            case "TSNonNullExpression":
            case "TSSatisfiesExpression":
            case "TSTypeAssertion":
                return visit(node.expression, node)
            case "MemberExpression": {
                if (node.computed) return all([node.object, node.property], node)
                return visit(node.object, node)
            }
            case "ChainExpression":
                return visit(node.expression, node)
            case "CallExpression":
            case "NewExpression": {
                const isNew = node.type === "NewExpression"
                if (isNew) isConstructed = true
                const callee = visit(node.callee, node)
                if (isNew) isConstructed = false
                if (callee === "found") {
                    if (!isNew && lead!.node === unwrap(node.callee)) lead!.isCallee = true
                    return "found"
                }
                if (callee !== "pure") return
                // a?.(v), a?.b(v): not called when there is nothing to call.
                if (isOptional(node)) return
                const found = all(node.arguments, node)
                // A call is never pure: the search ends here unless the parameter is one of its arguments.
                return found === "found" ? "found" : undefined
            }
            case "SpreadElement":
                return visit(node.argument, node) === "found" ? "found" : undefined
            case "ArrayExpression":
                return all(node.elements, node)
            case "ObjectExpression": {
                for (const property of node.properties) {
                    if (property.type !== "Property" || property.kind !== "init" || property.method) return
                    if (property.computed) {
                        const key = visit(property.key, property)
                        if (key !== "pure") return key
                    }
                    const value = visit(property.value, property)
                    if (value !== "pure") return value
                }
                return "pure"
            }
            case "TemplateLiteral":
                return all(node.expressions, node)
            case "BinaryExpression":
                return all([node.left, node.right], node)
            case "UnaryExpression": {
                if (node.operator === "delete") return
                return visit(node.argument, node)
            }
            // The right side is not always evaluated.
            case "LogicalExpression":
                return visit(node.left, node) === "found" ? "found" : undefined
            case "ConditionalExpression":
                return visit(node.test, node) === "found" ? "found" : undefined
            // Everything else may not happen at all, or does something that would be noticed.
            default:
                return undefined
        }
    }

    /** One after the other, as long as nothing happens. */
    function all(nodes: (Node | null)[], parent: Node): "found" | "pure" | undefined {
        for (const node of nodes) {
            const result = visit(node, parent)
            if (result !== "pure") return result
        }
        return "pure"
    }

    return visit(body) === "found" ? lead : undefined
}

/** a?.b(), a?.(), a?.b.c() */
function isOptional(node: Node): boolean {
    if (node.type === "CallExpression" && node.optional) return true
    const callee = node.type === "CallExpression" || node.type === "NewExpression" ? unwrap(node.callee) : node
    for (let current: Node = callee; current.type === "MemberExpression" || current.type === "CallExpression";) {
        if (current.optional) return true
        current = unwrap(current.type === "MemberExpression" ? current.object : current.callee)
    }
    return false
}

/**
 * `import { pipe as foo } from "from"` → `"foo"`, calls of the first one are replaced when there
 * are several.
 */
function findImport(statements: Node[], from: string): { count: number, local: string, node: ImportDeclaration } | undefined {
    let result: { count: number, local: string, node: ImportDeclaration } | undefined
    for (const node of statements) {
        if (node.type !== "ImportDeclaration" || node.importKind === "type" || node.source.value !== from) continue
        for (const specifier of node.specifiers) {
            if (specifier.type !== "ImportSpecifier" || specifier.importKind === "type") continue
            if (specifier.imported.type !== "Identifier" || specifier.imported.name !== "pipe") continue
            if (result) result.count++
            else result = { count: 1, local: specifier.local.name, node }
        }
    }
    return result
}

function countReferences(node: Node, name: string): number {
    let count = 0
    walk(node, {
        enter(node, parent) {
            if (node.type === "Identifier" && node.name === name && !isPropertyName(node, parent)) count++
        },
    })
    return count
}
