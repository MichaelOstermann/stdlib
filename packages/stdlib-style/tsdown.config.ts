import { defineConfig } from "tsdown"

export default defineConfig({
    clean: true,
    dts: true,
    // `local` is the JS plugin of our own rules, which Oxlint loads from next to the config.
    entry: ["./src/oxlint.ts", "./src/local.ts"],
    format: "esm",
})
