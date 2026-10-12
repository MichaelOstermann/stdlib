import { mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import Path from "node:path"
import { describe, expect, test } from "bun:test"
import { stdlib, transform } from "../src"

function expectSnapshot(code: string): void {
    const lines = code.trimEnd().split("\n").filter((line, i) => i > 0 || line.trim())
    const indent = Math.min(...lines.filter(line => line.trim()).map(line => line.search(/\S/)))
    const source = lines.map(line => line.slice(indent)).join("\n")
    expect(transform(source, "source.jsx", { react: true })?.code ?? source).toMatchSnapshot()
}

describe("react", () => {
    test("Should transform const Component = function() {}", () => {
        expectSnapshot(`
            export const Component = function() {
                const foo = $foo()
                return null
            }
        `)
    })

    test("Should transform function Component() {}", () => {
        expectSnapshot(`
            export function Component() {
                const foo = $foo()
                return null
            }
        `)
    })

    test("Should transform const Component = () => {}", () => {
        expectSnapshot(`
            export const Component = () => {
                const foo = $foo()
                return null
            }
        `)
    })

    test("Should transform functions containing jsx", () => {
        expectSnapshot(`
            export const component = () => {
                const foo = $foo()
                return <div />
            }
        `)
    })

    test("Should transform const useHook = function() {}", () => {
        expectSnapshot(`
            export const useHook = function() {
                const foo = $foo()
                return null
            }
        `)
    })

    test("Should transform function useHook() {}", () => {
        expectSnapshot(`
            export function useHook() {
                const foo = $foo()
                return null
            }
        `)
    })

    test("Should transform const useHook = () => {}", () => {
        expectSnapshot(`
            export const useHook = () => {
                const foo = $foo()
                return null
            }
        `)
    })

    test("Should ignore everything else", () => {
        expectSnapshot(`
            export const component = () => {
                const foo = $foo()
                return foo
            }
        `)
    })

    test("Should transform nested call expressions", () => {
        expectSnapshot(`
            export const useHook = () => {
                const foo = bar.$baz()
                return null
            }
        `)
    })

    test("Should transform nested call expressions 2", () => {
        expectSnapshot(`
            export const useHook = () => {
                const foo = bar.$baz.qux()
                return null
            }
        `)
    })

    test("Should wrap call expressions with arguments in arrow function", () => {
        expectSnapshot(`
            export const useHook = () => {
                const foo = bar.$baz({ a: 1 })
                return null
            }
        `)
    })

    test("Should transform complex expressions", () => {
        expectSnapshot(`
            export const useHook = () => {
                const a = $a() + $b()
                const b = { b: $b() }
                const c = [$c()]
                const d = util($d())
                return null
            }
        `)
    })

    test("Should transform JSX attributes", () => {
        expectSnapshot(`
            export const Component = () => {
                return (
                    <div style={$style()} />
                )
            }
        `)
    })

    test("Should transform JSX spread attributes", () => {
        expectSnapshot(`
            export const Component = () => {
                return (
                    <div {...$style()} />
                )
            }
        `)
    })

    test("Should transform JSX container expressions", () => {
        expectSnapshot(`
            export const Component = () => {
                return (
                    <div>
                        {$text()}
                    </div>
                )
            }
        `)
    })

    test("Should wrap identifier calls with arguments in arrow function", () => {
        expectSnapshot(`
            export const Component = () => {
                const foo = $foo(100)
                return <div>{$t("key", { a: 1 })}</div>
            }
        `)
    })

    test("Should ignore writes in statements and callbacks", () => {
        expectSnapshot(`
            export const Component = () => {
                $foo(100)
                const onClick = () => $foo(200)
                useEffect(() => {
                    $foo(300)
                })
                return <div onClick={() => $foo(400)} onKeyDown={onClick} />
            }
        `)
    })

    test("Should ignore already decorated signals", () => {
        expectSnapshot(`
            import { useSignal as useS } from "@monstermann/stdlib-react"
            export const Component = () => {
                const foo = useS($foo)
                return null
            }
        `)
    })

    test("Should reuse import", () => {
        expectSnapshot(`
            import { useSignal as useS } from "@monstermann/stdlib-react"
            export const Component = () => {
                const foo = $foo()
                return null
            }
        `)
    })

    test("Should wrap a hook argument, not the hook call, for a direct read", () => {
        expectSnapshot(`
            export function useHook() {
                const foo = useThing($foo())
                return foo
            }
        `)
    })

    test("Should wrap a hook argument, not the hook call, for a nested read", () => {
        expectSnapshot(`
            export function useHook() {
                const foo = useThing({ value: $foo() })
                return foo
            }
        `)
    })

    test("Should still wrap the whole expression inside a non-hook call", () => {
        expectSnapshot(`
            export function useHook() {
                const foo = util({ value: $foo() })
                return foo
            }
        `)
    })

    test("Should not wrap a bare member reference", () => {
        expectSnapshot(`
            export function useHook() {
                const foo = useThing({ $isOpen: bar.$baz })
                return foo
            }
        `)
    })

    test("Should not wrap a deeper member access that is never called", () => {
        expectSnapshot(`
            export function useHook() {
                const foo = bar.$baz.qux
                return foo
            }
        `)
    })

    test("Should wrap an invoked member-access chain", () => {
        expectSnapshot(`
            export function useHook() {
                const foo = a.$b.c.d()
                return foo
            }
        `)
    })

    test("Should skip files without a $", () => {
        expect(transform("export const Component = () => <div />", "source.jsx", { react: true })).toBe(undefined)
    })

    test("Should return nothing when there is nothing to wrap", () => {
        expect(transform("export const $count = signal(0)", "source.ts", { react: true })).toBe(undefined)
    })

    test("Should do nothing without the option", () => {
        expect(transform("export const Component = () => <div>{$count()}</div>", "source.jsx")).toBe(undefined)
    })

    test("Should return a sourcemap", () => {
        const result = transform("export const Component = () => <div>{$count()}</div>", "source.jsx", { react: true })
        expect(result?.map.sources).toEqual(["source.jsx"])
    })

    test("Should work together with hmr", () => {
        const code = [
            `import "@monstermann/stdlib/globals"`,
            `const $count = Signal(0)`,
            `Effect(() => console.log($count()))`,
            `export const Counter = () => <button>{$count()}</button>`,
        ].join("\n")
        const result = transform(code, "source.jsx", { hmr: true, react: true })
        expect(result?.code).toContain("import.meta.hot")
        expect(result?.code).toContain(`import { useSignal } from "@monstermann/stdlib-react";`)
        expect(result?.code).toContain("{useSignal($count)}")
        expect(result?.code).toContain("Effect(() => console.log($count()), meta)")
        expect(result?.code).toContain(`import { Signal } from "@monstermann/stdlib/Signal.mjs";`)
        expect(result?.map.sources).toEqual(["source.jsx"])
        expect(result?.map.mappings.length).toBeGreaterThan(0)
    })
})

describe("stdlib, with react", () => {
    const code = "export const Component = () => <div>{$count()}</div>"

    test("Should pass the react option on", () => {
        expect(stdlib({ react: true }).transform.handler(code, "/a/b.tsx")?.code).toContain("useSignal($count)")
        expect(stdlib({ react: false }).transform.handler(code, "/a/b.tsx")).toBe(undefined)
    })

    test("Should be enabled when @monstermann/stdlib-react is installed, unless it is said otherwise", async () => {
        const root = await mkdtemp(Path.join(tmpdir(), "stdlib-react-"))
        const nested = Path.join(root, "apps/web")
        await mkdir(nested, { recursive: true })

        const plugin = stdlib()
        plugin.configResolved({ command: "build", root: nested })
        expect(plugin.transform.handler(code, "/a/b.tsx")).toBe(undefined)

        // Found in the directories above as well, which is where a workspace installs it.
        await Bun.write(Path.join(root, "node_modules/@monstermann/stdlib-react/package.json"), "{}")
        plugin.configResolved({ command: "build", root: nested })
        expect(plugin.transform.handler(code, "/a/b.tsx")?.code).toContain("useSignal($count)")

        const disabled = stdlib({ react: false })
        disabled.configResolved({ command: "build", root: nested })
        expect(disabled.transform.handler(code, "/a/b.tsx")).toBe(undefined)

        await rm(root, { recursive: true })
    })
})
