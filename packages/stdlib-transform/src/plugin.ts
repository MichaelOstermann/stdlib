import type { StdlibOptions } from "./transform"
import { readFile } from "node:fs/promises"
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

/** Modules, with what a bundler may add to their path: `a.ts`, `a.mts`, `a.tsx?v=1` */
const modules = /\.m?[jt]sx?(?:\?.*)?$/

/** A plugin for Vite, Rolldown and tsdown. */
export function stdlib({ debug, enforce, exclude = [], hmr, include = modules }: StdlibPluginOptions = {}): StdlibPlugin {
    let isViteDevServer = false

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
                return transform(code, path, { debug: debug instanceof RegExp ? debug.test(path) : debug, hmr: hmr ?? isViteDevServer })
            },
        },
        configResolved(config) {
            isViteDevServer = config.command === "serve"
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
export function stdlibBun({ debug, exclude = [], hmr, include = modules }: Omit<StdlibPluginOptions, "enforce"> = {}): StdlibBunPlugin {
    const excluded = [dependencies, exclude].flat()

    return {
        name: "stdlib",
        setup(build) {
            for (const filter of [include].flat()) {
                build.onLoad({ filter }, async ({ loader, path }) => {
                    const code = await readFile(path, "utf8")
                    if (excluded.some(pattern => pattern.test(path))) return { contents: code, loader }
                    const result = transform(code, path, { debug: debug instanceof RegExp ? debug.test(path) : debug, hmr })
                    return { contents: result?.code ?? code, loader }
                })
            }
        },
    }
}
