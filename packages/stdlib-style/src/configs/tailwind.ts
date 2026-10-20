import type { Config, Options } from "../types.js"
import { plugin } from "../plugin.js"

export function tailwind(options: Options): Config {
    if (!options.tailwind) return {}

    return {
        jsPlugins: [
            plugin("better-tailwindcss", "eslint-plugin-better-tailwindcss"),
        ],
        rules: {
            "better-tailwindcss/enforce-consistent-class-order": "warn",
            "better-tailwindcss/no-concatenated-classes": "error",
            "better-tailwindcss/no-conflicting-classes": "error",
            "better-tailwindcss/no-deprecated-classes": "warn",
            "better-tailwindcss/no-duplicate-classes": "warn",
            "better-tailwindcss/no-unnecessary-whitespace": "warn",
        },
        settings: {
            "better-tailwindcss": {
                entryPoint: options.tailwind,
            },
        },
    }
}
