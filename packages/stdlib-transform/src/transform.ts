import type { Helpers } from "./match"
import remapping from "@jridgewell/remapping"
import { transform as treeshake } from "@monstermann/barrels-treeshake"
import { SourceMap } from "magic-string"
import { transformMessages } from "./i18n"
import { transformImports } from "./imports"
import { packages } from "./manifest"
import { transformMatches } from "./match"
import { transformObjects } from "./object"
import { transformPaths } from "./path"
import { transformPipes } from "./pipe"
import { transformReact } from "./react"
import { transformReplicas } from "./replicas"
import { replicas } from "./replicas.manifest"

const from = "@monstermann/stdlib"

const replicasOptions = {
    replicas,
    resolve: (replica: string, name: string): string => `${from}/${replica}/${name}`,
    sources: (replica: string): string[] => [from, `${from}/${replica}/index`],
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
 * - `Array.removeAll()` and `Duration.parse()` become direct imports of `removeAll` and `parse`,
 *   and so do `Rect.bottom()` and the others of `@monstermann/stdlib-web`
 * - `import { Array }` and the other replicas of natives are removed when everything else works
 *   with the native one: `new Set()`, `x instanceof Set`
 * - `match()` chains are compiled into conditional expressions
 * - `pipe()` calls are replaced with the calls they make
 * - `Object.setPath()` and `Object.mapPath()` calls with a path that is written out,
 *   `Object.merge()` calls with an object literal and `Object.pick()` calls with an array of
 *   strings are compiled into a function of their own
 * - everything else (`pipe`, `Result`, …) is imported from the file it lives in
 * - `m.auth.signIn` of `@monstermann/stdlib-i18n` becomes a direct import of `_authSignIn`
 * - in React components and hooks, reads of signals are wrapped with `useReactive` and their
 *   signals and effects created with `useSignal` and `useSignalEffect`, all from
 *   `@monstermann/stdlib-react`
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

    const messages = transformMessages(code, filePath)
    if (messages) {
        code = messages.toString()
        maps.push(messages.generateMap(generateMap))
    }

    const imported = code.includes(from)

    // Chains inside of the callbacks of another chain are compiled by another run.
    if (imported && code.includes("match")) {
        const helpers: Helpers = {}
        for (let matches = transformMatches(code, filePath, from, helpers); matches?.ms.hasChanged(); matches = transformMatches(code, filePath, from, helpers)) {
            for (const name of matches.unused) unused.add(name)
            code = matches.ms.toString()
            maps.push(matches.ms.generateMap(generateMap))
        }
    }

    // After chains: what they are compiled into is passed along like everything else.
    if (imported && code.includes("pipe")) {
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

    // After pipes: calls they had in their steps are written out by now. Before globals: a compiled call needs no import.
    if (code.includes("setPath") || code.includes("mapPath")) {
        const paths = transformPaths(code, filePath, from)
        if (paths.hasChanged()) {
            code = paths.toString()
            maps.push(paths.generateMap(generateMap))
        }
    }

    // Like paths: after pipes, before globals.
    if (code.includes("merge") || code.includes("pick")) {
        const objects = transformObjects(code, filePath, from)
        if (objects.hasChanged()) {
            code = objects.toString()
            maps.push(objects.generateMap(generateMap))
        }
    }

    // Nothing has been imported when the package is not mentioned, skip parsing. `@monstermann/stdlib-web` mentions it too.
    if (imported) {
        const replaced = transformReplicas(code, filePath, replicasOptions)
        if (replaced) {
            code = replaced.toString()
            maps.push(replaced.generateMap(generateMap))
        }

        const shaken = treeshake(code, filePath, {
            debug: options.debug,
            resolve({ importAlias, importName, importPath, propertyName }) {
                if (!importName || !packages.get(importPath)?.namespaces.has(importName)) return
                return `import { ${propertyName} as ${importAlias} } from "${importPath}/${importName}/${propertyName}";`
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
