import { plugin } from "bun"
import { transformSync } from "oxc-transform-react"
import { transform } from "../../stdlib-transform/src"

// The tests run the hooks and components transformed and compiled, as they ship.
plugin({
    name: "react-compiler",
    setup(build) {
        build.onLoad({ filter: /\/stdlib-react\/src\/.+\.tsx?$/ }, async ({ path }) => {
            const lang = path.endsWith(".tsx") ? "tsx" : "ts"
            const source = await Bun.file(path).text()
            const transformed = transform(source, path)?.code ?? source
            const result = transformSync(path, transformed, { jsx: "preserve", lang, reactCompiler: { panicThreshold: "all_errors" }, sourceType: "module" })
            if (result.errors.length) throw new Error(`${path}\n${result.errors.map((error) => error.message).join("\n")}`)
            return { contents: result.code, loader: lang }
        })
    },
})
