import type { Config } from "../types.js"

export function unicorn(): Config {
    return {
        plugins: ["unicorn"],
        rules: {
            "unicorn/consistent-empty-array-spread": "error",
            "unicorn/error-message": "error",
            "unicorn/new-for-builtins": "error",
            "unicorn/no-instanceof-builtins": "error",
            "unicorn/no-new-array": "error",
            "unicorn/prefer-dom-node-text-content": "error",
            "unicorn/prefer-node-protocol": "error",
            "unicorn/prefer-number-properties": "error",
            "unicorn/prefer-type-error": "error",
            "unicorn/throw-new-error": "error",
        },
    }
}
