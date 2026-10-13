import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { importEnd } from "./globals"
import { functions, namespaces } from "./manifest"

/**
 * Rewrites the remaining imports from `from` to the files that export them,
 * so the entry of the package, which imports everything, is never loaded:
 *
 * ```ts
 * import { pipe, Arr, type Result } from "@monstermann/stdlib";
 * ```
 *
 * ```ts
 * import type { Result } from "@monstermann/stdlib";
 * import { pipe } from "@monstermann/stdlib/pipe.mjs";
 * import { Arr } from "@monstermann/stdlib/Arr/index.mjs";
 * ```
 */
export function transformImports(code: string, filePath: string, from: string, unused: ReadonlySet<string>): MagicString {
    const ms = new MagicString(code, { filename: filePath })

    for (const node of parseSync(filePath, code).program.body) {
        if (node.type !== "ImportDeclaration" || node.importKind === "type" || node.source.value !== from) continue
        // import * as Fn from "@monstermann/stdlib"
        if (!node.specifiers.length || node.specifiers.some(specifier => specifier.type !== "ImportSpecifier")) continue

        const types: string[] = []
        const rest: string[] = []
        const imports: string[] = []

        for (const specifier of node.specifiers) {
            if (specifier.type !== "ImportSpecifier") continue
            const name = specifier.imported.type === "Identifier" ? specifier.imported.name : specifier.imported.value
            const text = code.slice(specifier.imported.start, specifier.end)
            if (specifier.importKind === "type") types.push(text)
            else if (unused.has(name)) continue
            else if (namespaces.has(name)) imports.push(`import { ${text} } from "${from}/${name}/index.mjs";`)
            else if (functions.has(name)) imports.push(`import { ${text} } from "${from}/${functions.get(name)}.mjs";`)
            else rest.push(text)
        }

        if (rest.length === node.specifiers.length) continue
        if (rest.length) imports.unshift(`import { ${rest.join(", ")} } from "${from}";`)
        if (types.length) imports.unshift(`import type { ${types.join(", ")} } from "${from}";`)
        ms.overwrite(node.start, importEnd(node, code), imports.join("\n"))
    }

    return ms
}
