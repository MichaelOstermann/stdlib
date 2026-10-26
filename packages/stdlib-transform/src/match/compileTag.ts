import type { Node } from "oxc-parser"
import type { Context } from "./types"
import { hasAwaitOrYield } from "./compileChain"
import { abort, unwrap } from "./helpers"
import { transformCallback } from "./transformCallback"

export interface Tag {
    handlers: Node
    key: Node
    subject: Node
}

/**
 * Collects the arguments of `match.tag(value, key, handlers)`, `local` being the name `match` is
 * imported as.
 */
export function collectTag(node: Node, local: string): Tag | undefined {
    if (node.type !== "CallExpression" || node.optional) return
    const callee = node.callee
    if (callee.type !== "MemberExpression" || callee.computed || callee.optional) return
    if (callee.object.type !== "Identifier" || callee.object.name !== local) return
    if (callee.property.type !== "Identifier" || callee.property.name !== "tag") return
    const [subject, key, handlers] = node.arguments
    if (!subject || !key || !handlers || node.arguments.length !== 3) return
    if (subject.type === "SpreadElement" || key.type === "SpreadElement" || handlers.type === "SpreadElement") return
    return { handlers, key, subject }
}

/**
 * Turns `match.tag(value, "type", { a: v => v.id, _: () => 0 })` into a conditional expression:
 *
 * ```ts
 * (value.type === "a" ? (value.id)
 * : (0))
 * ```
 */
export function compileTag(node: Node, tag: Tag, ctx: Context): string {
    const src = (node: Node): string => ctx.code.slice(node.start, node.end)

    const key = stringOf(unwrap(tag.key))
    const handlers = unwrap(tag.handlers)
    // Handlers that are not written where they are used are looked at when the code runs.
    if (key === undefined || handlers.type !== "ObjectExpression") abort()

    const names = new Set<string>()
    const cases: [name: string, handler: Node][] = []
    let fallback: Node | undefined

    for (const property of handlers.properties) {
        if (property.type !== "Property" || property.kind !== "init" || property.method || property.computed) abort()
        const name = property.key.type === "Identifier"
            ? property.key.name
            : property.key.type === "Literal" && (typeof property.key.value === "string" || typeof property.key.value === "number")
                ? String(property.key.value)
                : abort()
        // The last one of a key that is there several times wins, and `__proto__: value` is no handler.
        if (names.has(name) || (name === "__proto__" && !property.shorthand)) abort()
        names.add(name)
        if (name === "_") fallback = property.value
        else cases.push([name, property.value])
    }

    // Without anything to compare with, the tag would never be read.
    if (!cases.length) abort()

    // A subject that is not a stable name is evaluated once and passed as the argument of a function.
    let subject: string
    let wrap = (result: string): string => `(${result})`
    if (tag.subject.type === "Identifier" && ctx.isStable(tag.subject.name)) {
        subject = tag.subject.name
    }
    else {
        // `await` and `yield` can not be moved into a function.
        if (hasAwaitOrYield(node)) abort()
        subject = ctx.id("match")
        wrap = (result) => `((${subject}) => ${result})(${src(tag.subject)})`
    }

    const value = /^[a-z_$][\w$]*$/i.test(key) ? `${subject}.${key}` : `${subject}[${JSON.stringify(key)}]`
    const branches = cases.map(([name, handler]) => {
        const tests = [`${value} === ${JSON.stringify(name)}`]
        const other = literalOf(name)
        if (other) tests.push(`${value} === ${other}`)
        return `${tests.length > 1 ? `(${tests.join(" || ")})` : tests[0]} ? (${transformCallback(subject, unwrap(handler), ctx)})`
    })

    branches.push(fallback
        ? `(${transformCallback(subject, unwrap(fallback), ctx)})`
        : `${ctx.helper("throwUnmatched")}(${subject})`)

    return wrap(branches.join("\n: "))
}

/** `"type"`, `` `type` `` → `type` */
function stringOf(node: Node): string | undefined {
    if (node.type === "Literal") return typeof node.value === "string" ? node.value : undefined
    if (node.type === "TemplateLiteral" && !node.expressions.length) return node.quasis[0]?.value.cooked ?? undefined
    return undefined
}

/** What other than a string is handled by the key it is written as: `true`, `null`, `1` */
function literalOf(name: string): string | undefined {
    if (name === "true" || name === "false" || name === "null") return name
    if (name === "undefined") return "void 0"
    // No value is the same as `NaN`.
    if (name === "NaN") abort()
    if (name === "Infinity" || name === "-Infinity") return name
    return String(Number(name)) === name ? name : undefined
}
