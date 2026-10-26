import { stdlib } from "@monstermann/stdlib-transform"
import { transformSync } from "oxc-transform-react"
import { defineConfig } from "tsdown"

export default defineConfig({
    clean: true,
    dts: true,
    entry: ["./src/index.ts"],
    format: "esm",
    unbundle: true,
    plugins: [
        // Points what is imported from the package at the files it lives in, for the entry of it to not be loaded.
        stdlib(),
        reactCompiler(),
    ],
})

/**
 * Ships the hooks and components compiled: React Compiler does not touch what is in node_modules. A
 * component or hook it would skip fails the build.
 */
function reactCompiler() {
    return {
        name: "react-compiler",
        transform(code, id) {
            if (!/\/src\/.+\.tsx?$/.test(id)) return
            const result = transformSync(id, code, { jsx: "preserve", lang: id.endsWith(".tsx") ? "tsx" : "ts", reactCompiler: { panicThreshold: "all_errors" }, sourcemap: true, sourceType: "module" })
            if (result.errors.length) throw new Error(`${id}\n${result.errors.map((error) => error.message).join("\n")}`)
            return { code: result.code, map: result.map }
        },
    }
}
