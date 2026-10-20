import type { Config } from "../types.js"
import { GLOB_SRC } from "../constants.js"

export function disables(): Config {
    return {
        overrides: [{
            files: [
                `**/benchmarks/${GLOB_SRC}`,
                `**/notes/${GLOB_SRC}`,
                `**/playground/${GLOB_SRC}`,
                `**/scripts/${GLOB_SRC}`,
            ],
            rules: {
                "no-console": "off",
            },
        }],
    }
}
