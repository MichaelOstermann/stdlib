import { plugin } from "bun"
import { transformSync } from "oxc-transform-react"

// The tests run the hooks and components compiled, as they ship.
plugin({
    name: "react-compiler",
    setup(build) {
        build.onLoad({ filter: /\/stdlib-react\/src\/.+\.tsx?$/ }, async ({ path }) => {
            const lang = path.endsWith(".tsx") ? "tsx" : "ts"
            const result = transformSync(path, await Bun.file(path).text(), { jsx: "preserve", lang, reactCompiler: { panicThreshold: "all_errors" }, sourceType: "module" })
            if (result.errors.length) throw new Error(`${path}\n${result.errors.map((error) => error.message).join("\n")}`)
            return { contents: result.code, loader: lang }
        })
    },
})
