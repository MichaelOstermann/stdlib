import { defineConfig, flat, namespace } from "@monstermann/barrels"

export default defineConfig([
    // What is not a global of its own. `Array`, `Function` and the like are collected by scripts/globals.ts instead.
    namespace({
        entries: ["./packages/stdlib/src/Bytes", "./packages/stdlib/src/Duration", "./packages/stdlib/src/Retry"],
    }),
    flat({
        entries: "./packages/stdlib/src",
        exclude: ["declarations.ts", "globals.ts", "patch.ts"],
        include: ["*.ts", "{Bytes,Duration,Retry}/index.js"],
    }),
    // Not globals: what is in here is imported.
    namespace({
        entries: "./packages/stdlib-web/src/Rect",
    }),
    flat({
        entries: "./packages/stdlib-web/src",
        include: ["Rect/index.js"],
    }),
])
