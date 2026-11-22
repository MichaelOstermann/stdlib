import type { ImportDeclaration } from "oxc-parser"

/** TypeScript nodes that contain code. All other nodes are about types. */
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
 * Returns where an import ends. Without a semicolon, the parser may let the import reach a
 * semicolon on a later line. Removing the import up to there would move the lines in between.
 */
export function importEnd(node: ImportDeclaration, code: string): number {
    if (node.attributes.length) return node.end
    const end = node.source.end
    return code[end] === ";" ? end + 1 : end
}
