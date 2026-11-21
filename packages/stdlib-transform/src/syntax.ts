import type { ImportDeclaration } from "oxc-parser"

/** Nodes of TypeScript that contain code, every other one is about types. */
export const expressions = new Set([
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
 * Where an import ends. Without a semicolon it is taken to reach up to one that starts a later
 * line, removing that would move the lines in between.
 */
export function importEnd(node: ImportDeclaration, code: string): number {
    if (node.attributes.length) return node.end
    const end = node.source.end
    return code[end] === ";" ? end + 1 : end
}
