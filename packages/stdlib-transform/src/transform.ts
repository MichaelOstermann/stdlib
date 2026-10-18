import type { MetaParam } from "@monstermann/meta"
import type { SourceMap } from "magic-string"
import type { Helpers } from "./match"
import remapping from "@jridgewell/remapping"
import { transform as treeshake } from "@monstermann/barrels-treeshake"
import { transform as transformMeta } from "@monstermann/meta"
import { SourceMap as MagicSourceMap } from "magic-string"
import { transformGlobals } from "./globals"
import { globals, values } from "./globals.manifest"
import { transformImports } from "./imports"
import { guards, namespaces } from "./manifest"
import { transformMatches } from "./match"
import { transformPipes } from "./pipe"
import { transformReact } from "./react"

const from = "@monstermann/stdlib"

const globalsOptions = {
    globals,
    guards: guards.map(name => `${from}/${name}`),
    values: Object.fromEntries(Object.entries(values).map(([name, file]) => [name, `${from}/${file}.mjs`])),
    resolve: (global: string, name: string): string => `${from}/${global}/${name}.mjs`,
}

// Effects and emitters only receive `hmr`, which is enough to stop effects and clear the listeners of emitters.
const hmrOnly: MetaParam["meta"] = ({ hmr }) => ({ hmr })

/** Functions whose results are stopped or cleared when their module is replaced. At this point each one is imported from its own file, however the source referred to it. */
const hmrParams: MetaParam[] = [
    { function: "Effect", meta: hmrOnly, module: `${from}/Effect.mjs`, position: 2 },
    { function: "Effect.watch", meta: hmrOnly, module: `${from}/Effect.mjs`, position: 4 },
    { function: "Emitter", meta: hmrOnly, module: `${from}/Emitter.mjs`, position: 2 },
    { function: "AsyncEmitter", meta: hmrOnly, module: `${from}/Emitter.mjs`, position: 2 },
]

export interface StdlibOptions {
    /** Prints what is being replaced. */
    debug?: boolean
    /**
     * Whether to stop effects and clear the listeners of emitters when their module is replaced.
     * @default false
     */
    hmr?: boolean
    /**
     * Whether to wrap reads of signals in React components and hooks with `useSignal` from `@monstermann/stdlib-react`.
     * Signals are recognized by their `$` prefix: `$count()`, `state.$count()`.
     * @default false
     */
    react?: boolean
}

export interface StdlibResult {
    code: string
    map: SourceMap
}

/**
 * Makes using `@monstermann/stdlib` free:
 *
 * - `Array.removeAll()` and `Duration.parse()` become direct imports of `removeAll` and `parse`
 * - `match()` chains are compiled into conditional expressions
 * - `pipe()` calls are replaced with the calls they make
 * - everything else (`pipe`, `Result`, …) is imported from the file it lives in
 * - with `hmr`, effects and emitters are passed what stops them or clears their listeners when their module is replaced
 * - with `react`, reads of signals in components and hooks are wrapped with `useSignal`
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
    if (options.react) {
        const react = transformReact(code, filePath)
        if (react) {
            code = react.toString()
            maps.push(react.generateMap(generateMap))
        }
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

    // Nothing has been imported when the package is not mentioned, skip parsing.
    if (imported) {
        const shaken = treeshake(code, filePath, {
            debug: options.debug,
            resolve({ importAlias, importName, importPath, propertyName }) {
                if (importPath !== from || !importName || !namespaces.has(importName)) return
                return `import { ${propertyName} as ${importAlias} } from "${from}/${importName}/${propertyName}.mjs";`
            },
        })
        if (shaken) {
            code = shaken.code
            maps.push(shaken.map)
        }

        const imports = transformImports(code, filePath, from, unused)
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

    // After everything else: by now effects and emitters are imported from where they live.
    if (options.hmr && code.includes(from)) {
        const meta = transformMeta(code, filePath, { hmr: true, params: hmrParams })
        if (meta) {
            code = meta.code
            maps.push(meta.map)
        }
    }

    if (!maps.length) return

    return {
        code,
        get map() {
            if (maps.length === 1) return maps[0]!
            // Sourcemaps are combined in reverse order.
            return new MagicSourceMap(remapping(maps.toReversed() as never, () => null, { decodedMappings: true }) as never)
        },
    }
}
