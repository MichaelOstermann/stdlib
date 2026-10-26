import type { Expression, Node } from "oxc-parser"
import type { Context } from "./types"
import MagicString from "magic-string"
import { ScopeTracker, walk } from "oxc-walker"

/**
 * Turns calling a callback with the matched value into an expression:
 *
 * - `() => result` becomes `result`
 * - `v => v + 1` becomes `value + 1`
 *
 * A callback that can not be inlined without changing its behaviour is called directly:
 * `(callback)(value)`.
 */
export function transformCallback(value: string, cb: Node, ctx: Context): string {
    // A method is called without the object it belongs to, the same way it is when being passed along.
    const call = isFunction(cb) || cb.type === "Identifier"
        ? `(${ctx.code.slice(cb.start, cb.end)})(${value})`
        : `(0, ${ctx.code.slice(cb.start, cb.end)})(${value})`

    // Functions have their own `this` and `arguments`, async functions return a promise.
    if (cb.type !== "ArrowFunctionExpression" || cb.async) return call

    let body: Expression | undefined
    if (cb.body.type !== "BlockStatement") {
        body = cb.body
    }
    else {
        // () => {}, () => { return }, () => { return result }
        const statement = cb.body.body[0]
        if (cb.body.body.length > 1 || (statement && statement.type !== "ReturnStatement")) return call
        body = statement?.argument ?? undefined
    }

    if (cb.params.length === 0) return body ? ctx.code.slice(body.start, body.end) : "void 0"
    if (!body) return call

    const param = cb.params[0]!
    if (cb.params.length > 1 || param.type !== "Identifier") return call

    return inline(value, param.name, body, ctx) ?? call
}

export function isFunction(node: Node): boolean {
    return node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression"
}

/**
 * Replaces the parameter with the value, unless that is not possible without changing the meaning.
 */
export function inline(value: string, param: string, body: Expression, ctx: Pick<Context, "code">): string | undefined {
    // Collects all declarations first, including the ones that are hoisted above where they are written.
    const scope = new ScopeTracker({ preserveExitedScopes: true })
    walk(body, { scopeTracker: scope })
    scope.freeze()
    const parents: Node[] = []
    const start = body.start
    const code = new MagicString(ctx.code.slice(body.start, body.end))
    let isPossible = true

    walk(body, {
        scopeTracker: scope,
        enter(node) {
            const parent = parents.at(-1)
            parents.push(node)

            if (node.type !== "Identifier" || node.name !== param) return
            // import.meta, new.target
            if (parent?.type === "MetaProperty") return
            // Another declaration of the same name, further inside.
            if (scope.getDeclaration(param)?.node != null) return
            if (isPropertyName(node, parent)) return

            // The parameter is written to: v = 1, v++, [v] = list
            if (isWrittenTo(node, parents)) return void (isPossible = false)
            // Something further inside has the name of the value, and would be referred to instead.
            if (scope.getDeclaration(value)?.node != null) return void (isPossible = false)

            // { v } → { v: value }
            if (parent?.type === "Property" && parent.shorthand) code.overwrite(node.start - start, node.end - start, `${param}: ${value}`)
            else code.overwrite(node.start - start, node.end - start, value)
        },
        leave() {
            parents.pop()
        },
    })

    return isPossible ? code.toString() : undefined
}

export function isPropertyName(node: Node, parent: Node | null | undefined): boolean {
    if (parent?.type === "MemberExpression") return parent.property === node && !parent.computed
    // The key of a shorthand property is visited before its value, which is the one to replace.
    if (parent?.type === "Property") return parent.key === node && !parent.computed && (!parent.shorthand || parent.value !== node)
    if (parent?.type === "MethodDefinition" || parent?.type === "PropertyDefinition") return parent.key === node && !parent.computed
    return false
}

function isWrittenTo(node: Node, parents: Node[]): boolean {
    // Walks up through patterns: [v] = list, ({ a: v } = object)
    for (let i = parents.length - 2; i >= 0; i--) {
        const parent = parents[i]!
        const child = parents[i + 1]!
        if (parent.type === "UpdateExpression") return true
        if (parent.type === "AssignmentExpression") return parent.left === child
        if (parent.type === "ForInStatement" || parent.type === "ForOfStatement") return parent.left === child
        if (parent.type === "ArrayPattern" || parent.type === "ObjectPattern" || parent.type === "RestElement") continue
        if (parent.type === "AssignmentPattern" && parent.left === child) continue
        if (parent.type === "Property" && parent.value === child && parents[i - 1]?.type === "ObjectPattern") continue
        return false
    }
    return node.type !== "Identifier"
}
