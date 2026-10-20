import type { Helpers } from "./match"
import remapping from "@jridgewell/remapping"
import { transform as treeshake } from "@monstermann/barrels-treeshake"
import { SourceMap } from "magic-string"
import { transformGlobals } from "./globals"
import { globals, values } from "./globals.manifest"
import { transformImports } from "./imports"
import { guards, packages } from "./manifest"
import { transformMatches } from "./match"
import { transformPipes } from "./pipe"
import { transformReact } from "./react"

const from = "@monstermann/stdlib"

const globalsOptions = {
    globals,
    guards: guards.map((name) => `${from}/${name}`),
    values: Object.fromEntries(Object.entries(values).map(([name, file]) => [name, `${from}/${file}.mjs`])),
    resolve: (global: string, name: string): string => `${from}/${global}/${name}.mjs`,
}

export interface StdlibOptions {
    /** Prints what is being replaced. */
    debug?: boolean
}

export interface StdlibResult {
    code: string
    map: SourceMap
}

/**
 * Makes using `@monstermann/stdlib` free:
 *
 * - `Array.removeAll()` and `Duration.parse()` become direct imports of `removeAll` and `parse`, and so do `Rect.bottom()` and the others of `@monstermann/stdlib-web`
 * - `match()` chains are compiled into conditional expressions
 * - `pipe()` calls are replaced with the calls they make
 * - everything else (`pipe`, `Result`, …) is imported from the file it lives in
 * - in React components and hooks, reads of signals are wrapped with `useReactive` and their signals and effects created with `useSignal` and `useSignalEffect`, all from `@monstermann/stdlib-react`
 *
 * All of it is available as globals, and can be imported from the package as well.
 *
 * Returns `undefined` when nothing changed.
 */
export function transform(code: string, filePath: string, options: StdlibOptions = {}): StdlibResult | undefined {
    const maps: SourceMap[] = []
    const unused = new Set<string>()
    const generateMap = { hires: "boundary", includeContent: true, source: filePath } as const

    // Runs first: it looks for names written with a `$`, before other transforms rewrite them.
    const react = transformReact(code, filePath)
    if (react) {
        code = react.toString()
        maps.push(react.generateMap(generateMap))
    }

    const imported = code.includes(from)

    // Chains inside of the callbacks of another chain are compiled by another run.
    if (imported || code.includes("match")) {
        const helpers: Helpers = {}
        for (let matches = transformMatches(code, filePath, from, helpers); matches?.ms.hasChanged(); matches = transformMatches(code, filePath, from, helpers)) {
            for (const name of matches.unused) unused.add(name)
            code = matches.ms.toString()
            maps.push(matches.ms.generateMap(generateMap))
        }
    }

    // After chains: what they are compiled into is passed along like everything else.
    if (code.includes("pipe")) {
        let replaced = false
        for (let pipes = transformPipes(code, filePath, from); ; pipes = transformPipes(code, filePath, from)) {
            if (!pipes.ms.hasChanged()) {
                // Dropping an import by its name would drop the others of that name.
                if (replaced && !pipes.references && pipes.imports === 1) unused.add("pipe")
                break
            }
            replaced = true
            code = pipes.ms.toString()
            maps.push(pipes.ms.generateMap(generateMap))
        }
    }

    // Nothing has been imported when the package is not mentioned, skip parsing. `@monstermann/stdlib-web` mentions it too.
    if (imported) {
        const shaken = treeshake(code, filePath, {
            debug: options.debug,
            resolve({ importAlias, importName, importPath, propertyName }) {
                if (!importName || !packages.get(importPath)?.namespaces.has(importName)) return
                return `import { ${propertyName} as ${importAlias} } from "${importPath}/${importName}/${propertyName}.mjs";`
            },
        })
        if (shaken) {
            code = shaken.code
            maps.push(shaken.map)
        }

        const imports = transformImports(code, filePath, unused)
        if (imports.hasChanged()) {
            code = imports.toString()
            maps.push(imports.generateMap(generateMap))
        }
    }

    // Runs last: only the references to `match` that remain after compiling chains need an import.
    const replaced = transformGlobals(code, filePath, globalsOptions)
    if (replaced) {
        code = replaced.toString()
        maps.push(replaced.generateMap(generateMap))
    }

    if (!maps.length) return

    return {
        code,
        get map() {
            if (maps.length === 1) return maps[0]!
            // Sourcemaps are combined in reverse order.
            return new SourceMap(remapping(maps.toReversed() as never, () => null, { decodedMappings: true }) as never)
        },
    }
}
