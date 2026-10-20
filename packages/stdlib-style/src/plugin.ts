import type { ExternalPluginEntry } from "oxlint"
import { fileURLToPath } from "node:url"

// Resolved from this package, so consumers don't need the plugins hoisted into their own node_modules.
export function plugin(name: string, specifier: string): ExternalPluginEntry {
    return { name, specifier: fileURLToPath(import.meta.resolve(specifier)) }
}
