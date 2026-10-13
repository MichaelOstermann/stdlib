import type { Node } from "oxc-parser"

/** Thrown to leave a chain uncompiled. */
export class AbortError extends Error {}

export function abort(): never {
    throw new AbortError()
}

/** `(value)`, `value as T`, `value!` → `value` */
export function unwrap(node: Node): Node {
    while (
        node.type === "ParenthesizedExpression"
        || node.type === "TSAsExpression"
        || node.type === "TSSatisfiesExpression"
        || node.type === "TSNonNullExpression"
        || node.type === "TSTypeAssertion"
    ) {
        node = node.expression
    }
    return node
}
