import { describe, expect, it } from "bun:test"
import { transformSync } from "oxc-transform-react"
import { transform } from "../../stdlib-transform/src"

function compile(code: string): string {
    const transformed = transform(code, "source.tsx", { react: true })!.code
    const result = transformSync("source.tsx", transformed, { jsx: "preserve", lang: "tsx", reactCompiler: { panicThreshold: "all_errors" }, sourceType: "module" })
    if (result.errors.length) throw new Error(result.errors.map(error => error.message).join("\n"))
    return result.code
}

describe("transform, then React Compiler", () => {
    // Without the hooks, React Compiler caches `Signal(0)` together with `initial`, and creates it again when `initial` changes.
    it("should create a signal outside of what React Compiler caches", () => {
        const code = compile(`
            export function Counter({ initial }) {
                const $count = Signal(0)
                Effect(() => console.log($count()))
                return <button onClick={() => $count(initial)}>{initial}</button>
            }
        `)
        expect(code).toContain("\n\tconst $count = useSignal(0);\n")
        expect(code).toContain("\n\tuseSignalEffect(t1);\n")
    })
})
