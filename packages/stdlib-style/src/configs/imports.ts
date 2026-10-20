import type { Config } from "../types.js"

export function imports(): Config {
    return {
        plugins: ["import"],
        rules: {
            "import/consistent-type-specifier-style": ["error", "prefer-top-level"],
            "import/first": "error",
            "import/newline-after-import": ["error", { count: 1 }],
            "import/no-duplicates": "error",
            "import/no-mutable-exports": "error",
            "import/no-named-default": "error",
            "import/no-self-import": "error",
            "import/no-webpack-loader-syntax": "error",
        },
    }
}
