import type { OxlintConfig } from "oxlint"
import type { Options } from "./types.js"
import { disables } from "./configs/disables.js"
import { ignores } from "./configs/ignores.js"
import { imports } from "./configs/imports.js"
import { javascript } from "./configs/javascript.js"
import { local } from "./configs/local.js"
import { react } from "./configs/react.js"
import { regex } from "./configs/regex.js"
import { tailwind } from "./configs/tailwind.js"
import { typescript } from "./configs/typescript.js"
import { unicorn } from "./configs/unicorn.js"

export type { Options } from "./types.js"

export default function (options: Options = {}): OxlintConfig {
    const configs = [
        javascript(),
        typescript(),
        imports(),
        local(),
        regex(),
        react(options),
        tailwind(options),
        unicorn(),
        disables(),
    ]

    return {
        categories: { correctness: "off" },
        env: { browser: true, builtin: true, es2024: true, node: true },
        ignorePatterns: ignores(options),
        jsPlugins: configs.flatMap((config) => config.jsPlugins ?? []),
        options: { reportUnusedDisableDirectives: "error", typeAware: true },
        overrides: [...configs.flatMap((config) => config.overrides ?? []), ...options.overrides ?? []],
        plugins: configs.flatMap((config) => config.plugins ?? []),
        rules: Object.assign({}, ...configs.map((config) => config.rules)),
        settings: Object.assign({}, ...configs.map((config) => config.settings)),
    }
}
