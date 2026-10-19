import { describe, expect, test } from "bun:test"
import { stdlib, transform } from "../src"

function expectSnapshot(code: string): void {
    const lines = code.trimEnd().split("\n").filter((line, i) => i > 0 || line.trim())
    const indent = Math.min(...lines.filter(line => line.trim()).map(line => line.search(/\S/)))
    const source = lines.map(line => line.slice(indent)).join("\n")
    expect(transform(source, "source.jsx")?.code ?? source).toMatchSnapshot()
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

    test("Should ignore lowercase functions, even with jsx", () => {
        expectSnapshot(`
            export const component = () => {
                const foo = $foo()
                return <div />
            }
        `)
    })

    test("Should ignore jsx in a callback of a component", () => {
        expectSnapshot(`
            export function List({ items }) {
                return <ul>{items.map(item => <li>{item.$name()}</li>)}</ul>
            }
        `)
    })

    test("Should ignore a PascalCase function that returns an object", () => {
        expectSnapshot(`
            export function Transition($open) {
                const open = $open()
                return { open }
            }
        `)
    })

    test("Should ignore a PascalCase function whose last return is not a node", () => {
        expectSnapshot(`
            export const Factory = () => {
                const foo = $foo()
                if (foo) return null
                return () => foo
            }
        `)
    })

    test("Should ignore a PascalCase function with more params than props and a ref", () => {
        expectSnapshot(`
            export function Pair(a, b) {
                const foo = $foo()
                return <div />
            }
        `)
    })

    test("Should ignore a PascalCase function whose param is not props", () => {
        const code = "export function Count(count: number) {\n    const foo = $foo()\n    return <div />\n}"
        expect(transform(code, "source.tsx")).toBe(undefined)
    })

    test("Should transform a component with props and a ref", () => {
        expectSnapshot(`
            export function Input(props, inputRef) {
                const foo = $foo()
                return <input ref={inputRef} />
            }
        `)
    })

    test("Should transform memo and forwardRef callbacks", () => {
        expectSnapshot(`
            import { memo } from "react"
            export const a = memo(() => {
                const foo = $foo()
                return <div />
            })
            export const b = React.forwardRef((props, ref) => <div ref={ref}>{$foo()}</div>)
        `)
    })

    test("Should ignore a memo that is not the one of react", () => {
        expectSnapshot(`
            import { memo } from "@monstermann/signals"
            export const $current = memo(() => {
                const id = $currentId()
                if (!id) return undefined
                return $byId.get(id)
            })
        `)
    })

    test("Should transform components and hooks named by assignments and properties", () => {
        expectSnapshot(`
            Component = () => <div>{$foo()}</div>
            Foo.useHook = () => {
                const foo = $foo()
                return foo
            }
            export const components = {
                Row: () => <div>{$foo()}</div>,
                row: () => <div>{$foo()}</div>,
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
            import { useReactive as useS } from "@monstermann/stdlib-react"
            export const Component = () => {
                const foo = useS($foo)
                return null
            }
        `)
    })

    test("Should reuse import", () => {
        expectSnapshot(`
            import { useReactive as useS } from "@monstermann/stdlib-react"
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

    test("Should wrap only the read in an expression with jsx", () => {
        expectSnapshot(`
            export function Component({ tooltip }) {
                return <div>{tooltip.$mounted() && <Tooltip tooltip={tooltip} />}</div>
            }
        `)
    })

    test("Should wrap a read that only runs sometimes together with its condition", () => {
        expectSnapshot(`
            export function Component({ open, a }) {
                return (
                    <div>
                        {open && $text()}
                        {open && <B x={$x()} />}
                        {a ? <B y={$y()} /> : null}
                        {a?.$z()}
                    </div>
                )
            }
        `)
    })

    test("Should wrap the condition of an early return and a read in a return", () => {
        expectSnapshot(`
            export function Component() {
                if (!$open()) return null
                return <div />
            }
            export function useCount() {
                return $count()
            }
        `)
    })

    test("Should throw for a read after an early return", () => {
        const code = "export function Component({ open }) {\n    if (!open) return null\n    const x = $x()\n    return <div>{x}</div>\n}"
        expect(() => transform(code, "source.jsx")).toThrow("source.jsx:3:15: Component reads $x() after an early return, where it cannot become a hook. Read it before, or in a component of its own.")
    })

    test("Should throw for a read inside an if, a loop, a switch or a try", () => {
        const read = (statement: string) => () => transform(`export function Component({ a, items }) {\n    ${statement}\n    return <div />\n}`, "source.jsx")
        expect(read("if (a) { const x = $x() }")).toThrow("Component reads $x() inside an if")
        expect(read("for (const item of items) { const x = item.$x() }")).toThrow("Component reads item.$x() inside a loop")
        expect(read("switch (a) { case 1: { const x = $x() } }")).toThrow("Component reads $x() inside a switch")
        expect(read("try { const x = $x() } catch {}")).toThrow("Component reads $x() inside a try")
    })

    test("Should not throw for reads and writes that are not wrapped", () => {
        expectSnapshot(`
            export function Component({ open, items }) {
                if (open) $open(false)
                for (const item of items) item.$seen(true)
                if (!open) return null
                return <div onClick={() => { const x = $x() }} />
            }
            export function create() {
                if (a) return null
                const x = $x()
            }
        `)
    })

    test("Should create signals and effects with hooks in components and hooks", () => {
        expectSnapshot(`
            export function Counter() {
                const $count = Signal(0)
                const $other = Signal(null, { equals })
                Effect(() => console.log($count()))
                return <button>{$count()}</button>
            }
            export function useCounter() {
                const $count = Signal(0)
                Effect(function () {
                    if ($count() > 10) this.dispose()
                })
                return $count
            }
        `)
    })

    test("Should keep the type arguments of a signal", () => {
        const code = "export function Component() {\n    const $el = Signal<Element | null>(null)\n    return null\n}"
        expect(transform(code, "source.tsx")?.code).toContain("const $el = useSignal<Element | null>(null)")
    })

    test("Should create signals and effects with hooks without a $ in the file", () => {
        expectSnapshot(`
            export function Logger({ message }) {
                Effect(() => console.log(message))
                return null
            }
        `)
    })

    test("Should leave signals and effects alone outside of top-level statements", () => {
        expectSnapshot(`
            const $global = Signal(0)
            Effect(() => console.log($global()))
            export function Component({ open }) {
                const stop = Effect(() => {})
                if (open) Effect(() => {})
                const onClick = () => {
                    const $local = Signal(0)
                    Effect(() => {})
                }
                const $a = open ? Signal(1) : Signal(2)
                return <div onClick={onClick} />
            }
            export function create() {
                const $count = Signal(0)
                Effect(() => {})
                return $count
            }
        `)
    })

    test("Should not wrap a read in the initial value of a signal", () => {
        expectSnapshot(`
            export function Component() {
                const $copy = Signal($count())
                return null
            }
        `)
    })

    test("Should follow imports of Signal and Effect", () => {
        expectSnapshot(`
            import { Signal as S, Effect as E } from "@monstermann/stdlib"
            import { Signal } from "some-other-package"
            import { useSignal as useS } from "@monstermann/stdlib-react"
            export function Component() {
                const $a = S(0)
                const $b = Signal(0)
                E(() => {})
                return null
            }
        `)
    })

    test("Should skip files without a $", () => {
        expect(transform("export const Component = () => <div />", "source.jsx")).toBe(undefined)
    })

    test("Should return nothing when there is nothing to wrap", () => {
        expect(transform("export const $count = signal(0)", "source.ts")).toBe(undefined)
    })

    test("Should return a sourcemap", () => {
        const result = transform("export const Component = () => <div>{$count()}</div>", "source.jsx")
        expect(result?.map.sources).toEqual(["source.jsx"])
    })

    test("Should work together with hmr", () => {
        const code = [
            `import "@monstermann/stdlib/globals"`,
            `const $count = Signal(0)`,
            `Effect(() => console.log($count()))`,
            `export const Counter = () => <button>{$count()}</button>`,
        ].join("\n")
        const result = transform(code, "source.jsx", { hmr: true })
        expect(result?.code).toContain("import.meta.hot")
        expect(result?.code).toContain(`import { useReactive } from "@monstermann/stdlib-react";`)
        expect(result?.code).toContain("{useReactive($count)}")
        expect(result?.code).toContain("Effect(() => console.log($count()), meta)")
        expect(result?.code).toContain(`import { Signal } from "@monstermann/stdlib/Signal.mjs";`)
        expect(result?.map.sources).toEqual(["source.jsx"])
        expect(result?.map.mappings.length).toBeGreaterThan(0)
    })
})

describe("stdlib, with react", () => {
    test("Should transform components in the plugins", () => {
        const code = "export const Component = () => <div>{$count()}</div>"
        expect(stdlib().transform.handler(code, "/a/b.tsx")?.code).toContain("useReactive($count)")
    })
})
