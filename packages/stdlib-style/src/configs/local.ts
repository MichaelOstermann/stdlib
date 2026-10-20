import type { Config } from "../types.js"
import { fileURLToPath } from "node:url"

export function local(): Config {
    return {
        jsPlugins: [
            // Built next to the config, see `tsdown.config.ts`.
            { name: "stdlib-style", specifier: fileURLToPath(new URL("./local.mjs", import.meta.url)) },
        ],
        rules: {
            "stdlib-style/no-mixed-operators": "error",
        },
    }
}
