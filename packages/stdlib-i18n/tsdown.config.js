import { stdlib } from "@monstermann/stdlib-transform"
import { defineConfig } from "tsdown"

export default [
    defineConfig({
        clean: true,
        dts: true,
        entry: ["./src/index.ts"],
        format: "esm",
        plugins: [stdlib()],
        unbundle: true,
    }),
    defineConfig({
        dts: false,
        entry: ["./src/cli.ts"],
        format: "esm",
        plugins: [stdlib()],
        unbundle: true,
        outputOptions: {
            banner: "#!/usr/bin/env bun",
        },
    }),
]
