import { stdlib } from "@monstermann/stdlib-transform"
import { defineConfig } from "tsdown"

export default defineConfig({
    clean: true,
    dts: true,
    entry: ["./src/index.ts"],
    format: "esm",
    // Points what is imported from the package at the files it lives in, for the entry of it to not be loaded.
    plugins: [stdlib()],
    unbundle: true,
})
