import type { StdlibOptions } from "./transform"
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import Path from "node:path"
import { transform } from "./transform"

export interface StdlibPluginOptions extends Omit<StdlibOptions, "debug"> {
    /** Prints what is being replaced, optionally only for files whose path matches. */
    debug?: boolean | RegExp
    enforce?: "post" | "pre"
    /** Skip files whose path matches one of these. Dependencies are always skipped. */
    exclude?: RegExp | RegExp[]
    /**
     * Whether to stop effects and clear the listeners of emitters when their module is replaced.
     * @default true when used with the dev server of Vite
     */
    hmr?: boolean
    /**
     * Only transform files whose path matches one of these.
     * @default /\.m?[jt]sx?(?:\?.*)?$/
     */
    include?: RegExp | RegExp[]
    /**
     * Whether to wrap reads of signals in React components and hooks with `useReactive`, and to create their signals and effects with `useSignal` and `useSignalEffect`.
     * @default true when `@monstermann/stdlib-react` is installed
     */
    react?: boolean
}

export interface StdlibPlugin {
    enforce?: "post" | "pre"
    name: string
    transform: {
        filter: { id: { exclude: RegExp[], include: RegExp[] } }
        handler: (code: string, id: string) => ReturnType<typeof transform>
    }
    configResolved: (config: { command: string, root?: string }) => void
}

/** Dependencies are skipped: how a package in `node_modules` uses globals is its own business. */
const dependencies = /(?:^|[\\/])node_modules[\\/]/

/** Whether a package can be found from `root`, in the `node_modules` of it or of a directory above. */
function isInstalled(name: string, root: string): boolean {
    for (let dir = Path.resolve(root); ; dir = Path.dirname(dir)) {
        if (existsSync(Path.join(dir, "node_modules", name, "package.json"))) return true
        if (dir === Path.dirname(dir)) return false
    }
}

const react = "@monstermann/stdlib-react"

/** Modules, with what a bundler may add to their path: `a.ts`, `a.mts`, `a.tsx?v=1` */
const modules = /\.m?[jt]sx?(?:\?.*)?$/

/** A plugin for Vite, Rolldown and tsdown. */
export function stdlib({ debug, enforce, exclude = [], hmr, include = modules, react: wrap }: StdlibPluginOptions = {}): StdlibPlugin {
    let isViteDevServer = false
    let hasReact = wrap ?? isInstalled(react, process.cwd())

    const id = {
        exclude: [dependencies, exclude].flat(),
        include: [include].flat(),
    }

    return {
        enforce,
        name: "stdlib",
        transform: {
            filter: { id },
            handler(code, path) {
                // Bundlers that do not know hook filters call the handler for every file.
                if (id.exclude.some(pattern => pattern.test(path))) return
                if (!id.include.some(pattern => pattern.test(path))) return
                return transform(code, path, { debug: debug instanceof RegExp ? debug.test(path) : debug, hmr: hmr ?? isViteDevServer, react: hasReact })
            },
        },
        configResolved(config) {
            isViteDevServer = config.command === "serve"
            if (config.root) hasReact = wrap ?? isInstalled(react, config.root)
        },
    }
}

export interface StdlibBunPlugin {
    name: string
    /** Typed by its shape, to not depend on the types of Bun. */
    setup: <Loader>(build: {
        onLoad: (
            constraints: { filter: RegExp },
            callback: (args: { loader: Loader, path: string }) => Promise<{ contents: string, loader: Loader }>,
        ) => unknown
    }) => void
}

/**
 * A plugin for Bun, for `Bun.build` and for a preload that makes `bun test` and `bun run` go through the transform:
 *
 * ```ts
 * import { plugin } from "bun";
 * import { stdlibBun } from "@monstermann/stdlib-transform";
 *
 * plugin(stdlibBun());
 * ```
 *
 * Bun only uses the first `onLoad` that returns something, call `transform` from your own when there are others.
 */
export function stdlibBun({ debug, exclude = [], hmr, include = modules, react: wrap }: Omit<StdlibPluginOptions, "enforce"> = {}): StdlibBunPlugin {
    const excluded = [dependencies, exclude].flat()
    const hasReact = wrap ?? isInstalled(react, process.cwd())

    return {
        name: "stdlib",
        setup(build) {
            for (const filter of [include].flat()) {
                build.onLoad({ filter }, async ({ loader, path }) => {
                    const code = await readFile(path, "utf8")
                    if (excluded.some(pattern => pattern.test(path))) return { contents: code, loader }
                    const result = transform(code, path, { debug: debug instanceof RegExp ? debug.test(path) : debug, hmr, react: hasReact })
                    return { contents: result?.code ?? code, loader }
                })
            }
        },
    }
}
