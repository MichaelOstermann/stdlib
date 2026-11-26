import { stdlib } from "@monstermann/stdlib-transform"
import { defineConfig } from "tsdown"

export default defineConfig({
    clean: true,
    dts: true,
    entry: ["./src/index.ts", "./src/sqlite.ts", "./src/viewer.ts"],
    format: "esm",
    plugins: [stdlib()],
    unbundle: true,
})
