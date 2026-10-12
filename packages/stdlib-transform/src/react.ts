import type { ArrowFunctionExpression, Expression, Function, JSXExpression, Node } from "oxc-parser"
import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { walk } from "oxc-walker"

interface Scope {
    expressions: Set<JSXExpression | Expression>
    fn: Function | ArrowFunctionExpression
    react: boolean
}

/**
 * Wraps reads of signals in components and hooks with `useSignal`.
 * Signals are recognized by their `$` prefix: `$count()`, `state.$count()`.
 */
export function transformReact(code: string, id: string): MagicString | undefined {
    // Nothing to do without a `$`, skip parsing.
    if (!code.includes("$")) return

    const filename = id.split("?", 1)[0]!
    const { program } = parseSync(filename, code)
    const ms = new MagicString(code, { filename })
    const ids = new Set<string>()
    let useSignal = ""
    let skip = 0
    const parents: Node[] = []
    const scopes: Scope[] = []
    const scopeStack: Scope[] = []

    function generateId(base: string): string {
        let count = 0
        while (ids.has(`${base}${count || ""}`)) count++
        const id = `${base}${count || ""}`
        ids.add(id)
        return id
    }

    function getUseSignal(): string {
        if (useSignal) return useSignal
        useSignal = generateId("useSignal")
        if (useSignal === "useSignal")
            ms.appendRight(0, `import { ${useSignal} } from "@monstermann/stdlib-react";\n`)
        else
            ms.appendRight(0, `import { useSignal as ${useSignal} } from "@monstermann/stdlib-react";\n`)
        return useSignal
    }

    walk(program, {
        enter(node, parent) {
            if (
                node.type === "FunctionDeclaration"
                || node.type === "FunctionExpression"
                || node.type === "ArrowFunctionExpression"
            ) {
                // function Component() {}
                // function useHook() {}
                if (
                    node.id
                    && node.id.type === "Identifier"
                    && isReactIdentifier(node.id.name)
                ) {
                    const scope: Scope = { expressions: new Set(), fn: node, react: true }
                    scopes.push(scope)
                    scopeStack.push(scope)
                }

                // const Component = function() {}
                // const useHook = function() {}
                else if (
                    parent?.type === "VariableDeclarator"
                    && parent.id.type === "Identifier"
                    && isReactIdentifier(parent.id.name)
                ) {
                    const scope: Scope = { expressions: new Set(), fn: node, react: true }
                    scopes.push(scope)
                    scopeStack.push(scope)
                }

                else {
                    const scope: Scope = { expressions: new Set(), fn: node, react: false }
                    scopes.push(scope)
                    scopeStack.push(scope)
                }
            }

            else if (node.type.startsWith("JSX")) {
                const scope = scopeStack.at(-1)
                if (scope) scope.react = true
            }

            else if (node.type === "ImportDeclaration") {
                if (node.source.value === "@monstermann/stdlib-react") {
                    for (const specifier of node.specifiers) {
                        if (
                            specifier.type === "ImportSpecifier"
                            && specifier.imported.type === "Identifier"
                            && specifier.imported.name === (useSignal || "useSignal")
                        ) {
                            useSignal = specifier.local.name
                        }
                    }
                }
            }

            else if (
                node.type === "CallExpression"
                && node.callee.type === "Identifier"
                && node.callee.name === useSignal
            ) {
                skip++
            }

            // $foo(), $foo(arg), foo.$bar(), foo.$bar.baz()
            else if (
                !skip
                && (
                    // $foo(), $foo(arg)
                    (node.type === "CallExpression"
                        && node.callee.type === "Identifier"
                        && node.callee.name.startsWith("$"))
                    // foo.$bar(), foo.$bar.baz()
                    || (node.type === "MemberExpression"
                        && node.property.type === "Identifier"
                        && node.property.name.startsWith("$")
                        && isInvoked(node, parents))
                )
            ) {
                const scope = scopeStack.at(-1)
                if (scope) {
                    for (const expression of findWrapTargets(parents, node)) {
                        scope.expressions.add(expression)
                    }
                }
            }

            else if (node.type === "Identifier") {
                ids.add(node.name)
            }

            parents.push(node)
        },
        leave(node) {
            if (
                node.type === "CallExpression"
                && node.callee.type === "Identifier"
                && node.callee.name === useSignal
            ) {
                skip--
            }

            if (node === scopeStack.at(-1)?.fn) {
                scopeStack.pop()
            }

            parents.pop()
        },
    })

    for (const scope of scopes) {
        if (!scope.react) continue
        for (const expression of scope.expressions) {
            // useSignal(() => (expression))
            if (shouldWrap(expression)) {
                ms.appendRight(expression.start, `${getUseSignal()}(() => (`)
                ms.appendRight(expression.end, "))")
            }
            // useSignal(expression)
            else {
                ms.appendRight(expression.start, `${getUseSignal()}(`)
                ms.remove(expression.end - 2, expression.end - 1)
            }
        }
    }

    return ms.hasChanged() ? ms : undefined
}

function isReactIdentifier(name: string): boolean {
    // PascalCase component name.
    if (/^[A-Z]/.test(name)) return true
    // useHook name.
    if (/^use[A-Z]/.test(name)) return true
    return false
}

function shouldWrap(node: JSXExpression | Expression): boolean {
    // $foo(arg) needs to be wrapped with a function: useSignal(() => $foo(arg)),
    // whereas $foo() does not: useSignal($foo).
    return !(node.type === "CallExpression" && node.arguments.length === 0)
}

// Walks up from a signal read to the expression(s) that should be wrapped with
// `useSignal(...)` - usually the nearest variable declaration or JSX expression.
function findWrapTargets(parents: Node[], readNode: Node): (JSXExpression | Expression)[] {
    let child: Node = readNode
    let i = parents.length
    while (i--) {
        const node = parents[i]!

        // The read belongs to an inner function scope - nothing to wrap out here.
        if (
            node.type === "FunctionDeclaration"
            || node.type === "FunctionExpression"
            || node.type === "ArrowFunctionExpression"
        ) {
            return []
        }

        // The read sits inside a hook call - wrap the argument that contains it, not
        // the enclosing declaration, so the hook call itself is never moved into
        // `useSignal(() => (...))` (rules of hooks).
        if (node.type === "CallExpression" && isHookCallee(node.callee)) {
            const argument = node.arguments.find(argument => argument === child)
            // A spread argument (`useFoo(...$foo())`) can't be wrapped in place.
            return argument && argument.type !== "SpreadElement" ? [argument] : []
        }

        if (node.type === "VariableDeclaration") {
            return node.declarations
                .map(declaration => declaration.init)
                .filter((init): init is Expression => init != null)
        }

        if (node.type === "JSXExpressionContainer") {
            return node.expression.type === "JSXEmptyExpression" ? [] : [node.expression]
        }

        if (node.type === "JSXSpreadAttribute") {
            return [node.argument]
        }

        child = node
    }

    return []
}

// foo.$bar()       -> true
// foo.$bar.baz()   -> true
// a.$b.c.d()       -> true
// foo.$bar         -> false
// foo.$bar.baz     -> false
function isInvoked(memberNode: Node, parents: Node[]): boolean {
    let current: Node = memberNode
    for (let i = parents.length - 1; i >= 0; i--) {
        const ancestor = parents[i]!
        if (ancestor.type === "MemberExpression" && ancestor.object === current) {
            current = ancestor
            continue
        }
        return ancestor.type === "CallExpression" && ancestor.callee === current
    }
    return false
}

// `useFoo(...)` or `obj.useFoo(...)`
function isHookCallee(callee: Node): boolean {
    if (callee.type === "Identifier") {
        return /^use[A-Z]/.test(callee.name)
    }
    if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
        return /^use[A-Z]/.test(callee.property.name)
    }
    return false
}
