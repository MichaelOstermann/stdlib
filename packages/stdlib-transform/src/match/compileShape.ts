import type { Node, ObjectExpression } from "oxc-parser"
import type { Context, Subject } from "./types"
import { unwrap } from "./helpers"

/** Whether the value has the shape of a pattern, the same way `matches` tells. */
export function compileShape(subject: Subject, pattern: Node, ctx: Context): string {
    const src = (node: Node): string => ctx.code.slice(node.start, node.end)
    const node = unwrap(pattern)

    if (node.type === "ObjectExpression" && subject.kind === "value") {
        const fields = compileFields(subject.name, node, ctx)
        if (fields) return `(${[`typeof ${subject.name} === "object"`, `${subject.name} !== null`, ...fields].join(" && ")})`
    }

    if (node.type === "ArrayExpression" && node.elements.every((element) => element && element.type !== "SpreadElement")) {
        const elements = node.elements.map((element) => element!)
        const compare = (at: (index: number) => string): string[] => elements.flatMap((element, index) => {
            return isWildcard(element, ctx) ? [] : [`${at(index)} === (${src(element)})`]
        })

        if (subject.kind === "tuple") {
            if (elements.length !== subject.names.length) return "false"
            const checks = compare((index) => subject.names[index]!)
            return checks.length ? `(${checks.join(" && ")})` : "true"
        }

        const checks = compare((index) => `${subject.name}[${index}]`)
        return `(${[`Array.isArray(${subject.name})`, `${subject.name}.length === ${elements.length}`, ...checks].join(" && ")})`
    }

    // A pattern that is not written where it is used is looked at when the code runs.
    return `${ctx.helper("matches")}(${subject.kind === "tuple" ? `[${subject.names.join(", ")}]` : subject.name}, ${src(pattern)})`
}

function compileFields(value: string, pattern: ObjectExpression, ctx: Context): string[] | undefined {
    const fields: string[] = []
    const keys = new Set<string>()
    for (const property of pattern.properties) {
        if (property.type !== "Property" || property.kind !== "init" || property.method) return
        const isName = !property.computed && property.key.type === "Identifier"
        // A key that is computed could turn out to be one of the others.
        if (!isName && property.key.type !== "Literal") return
        const key = property.key.type === "Identifier" ? property.key.name : String((property.key as { value?: unknown }).value)
        // The last one of a key that is there several times wins, and `__proto__: value` is no field.
        if (keys.has(key) || (key === "__proto__" && !property.computed && !property.shorthand)) return
        keys.add(key)
        const field = isName ? `${value}.${key}` : `${value}[${ctx.code.slice(property.key.start, property.key.end)}]`
        fields.push(`${field} === (${ctx.code.slice(property.value.start, property.value.end)})`)
    }
    return fields
}

/** `_` and `match._`, as what they have been imported as. */
function isWildcard(node: Node, ctx: Context): boolean {
    if (node.type === "Identifier") {
        if (node.name !== ctx.wildcard || !ctx.isImport(node.name)) return false
        ctx.used._++
        return true
    }

    if (
        node.type !== "MemberExpression"
        || node.computed
        || node.object.type !== "Identifier"
        || node.object.name !== ctx.match
        || node.property.type !== "Identifier"
        || node.property.name !== "_"
    ) {
        return false
    }

    ctx.used.match++
    return true
}
