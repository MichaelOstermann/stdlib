import type { ArrowFunctionExpression, CallExpression, Expression, Function, JSXExpression, Node, ParamPattern } from "oxc-parser"
import MagicString from "magic-string"
import { parseSync } from "oxc-parser"
import { walk } from "oxc-walker"

type FunctionNode = Function | ArrowFunctionExpression

type Hook = "useReactive" | "useSignal" | "useSignalEffect"

interface Scope {
    // Signal(), Effect() calls that become useSignal(), useSignalEffect()
    creates: Map<CallExpression, Hook>
    // Reads that cannot become hooks.
    errors: { message: string, node: Node }[]
    expressions: Set<JSXExpression | Expression>
    fn: FunctionNode
    kind: "component" | "hook" | "callback" | undefined
    name: string
    returned: boolean
    returnsNonNode: boolean
}

const hooks: Hook[] = ["useReactive", "useSignal", "useSignalEffect"]

/**
 * Wraps reads of signals in components and hooks with `useReactive`.
 * Signals are recognized by their `$` prefix: `$count()`, `state.$count()`.
 * `Signal()` and `Effect()` in their top-level statements become `useSignal()` and `useSignalEffect()`.
 */
export function transformReact(code: string, id: string): MagicString | undefined {
    // Nothing to do without a `$`, a signal or an effect, skip parsing.
    if (!code.includes("$") && !code.includes("Signal") && !code.includes("Effect")) return

    const filename = id.split("?", 1)[0]!
    const { program } = parseSync(filename, code)
    const ms = new MagicString(code, { filename })
    const ids = new Set<string>()
    // The local names of the hooks, of `Signal` and of `Effect`.
    const imported = new Map<Hook, string>()
    const creates = new Map<string, Hook>([["Effect", "useSignalEffect"], ["Signal", "useSignal"]])
    const allCreates = new Set<CallExpression>()
    // The local names of memo and forwardRef from react.
    const reactApis = new Set<string>()
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

    function getImport(hook: Hook): string {
        let local = imported.get(hook)
        if (local) return local
        local = generateId(hook)
        imported.set(hook, local)
        if (local === hook) {
            ms.appendRight(0, `import { ${local} } from "@monstermann/stdlib-react";\n`)
        }
        else {
            ms.appendRight(0, `import { ${hook} as ${local} } from "@monstermann/stdlib-react";\n`)
        }
        return local
    }

    walk(program, {
        enter(node, parent) {
            if (
                node.type === "FunctionDeclaration"
                || node.type === "FunctionExpression"
                || node.type === "ArrowFunctionExpression"
            ) {
                const name = getName(node, parent)
                const scope: Scope = {
                    creates: new Map(),
                    errors: [],
                    expressions: new Set(),
                    fn: node,
                    kind: getKind(node, parent, reactApis),
                    name: name ? code.slice(name.start, name.end) : "A component",
                    returned: false,
                    // () => ({})
                    returnsNonNode: node.body?.type !== "BlockStatement" && isNonNode(node.body),
                }
                scopes.push(scope)
                scopeStack.push(scope)
            }

            else if (node.type === "ReturnStatement") {
                // The last return decides, as in React Compiler.
                const scope = scopeStack.at(-1)
                if (scope) scope.returnsNonNode = isNonNode(node.argument)
            }

            else if (node.type === "ImportDeclaration") {
                for (const specifier of node.specifiers) {
                    const name = specifier.type === "ImportSpecifier" && specifier.imported.type === "Identifier"
                        ? specifier.imported.name
                        : undefined
                    const local = specifier.local.name
                    // import { memo } from "react"
                    if (node.source.value === "react") {
                        if (name === "memo" || name === "forwardRef") reactApis.add(local)
                    }
                    // import { useReactive as useR } from "@monstermann/stdlib-react"
                    else if (node.source.value === "@monstermann/stdlib-react") {
                        const hook = hooks.find((hook) => hook === name)
                        if (hook) imported.set(hook, local)
                    }
                    // import { Signal as S } from "@monstermann/stdlib"
                    else if (node.source.value === "@monstermann/stdlib" && (name === "Signal" || name === "Effect")) {
                        creates.set(local, creates.get(name)!)
                    }
                    // A `Signal` or an `Effect` of some other package.
                    else {
                        creates.delete(local)
                    }
                }
            }

            else if (
                node.type === "CallExpression"
                && node.callee.type === "Identifier"
                && node.callee.name === imported.get("useReactive")
            ) {
                skip++
            }

            // const $foo = Signal(), Effect()
            else if (
                node.type === "CallExpression"
                && node.callee.type === "Identifier"
                && creates.has(node.callee.name)
            ) {
                const scope = scopeStack.at(-1)
                const hook = creates.get(node.callee.name)!
                if (scope && isTopLevel(scope, parents, node, hook)) {
                    scope.creates.set(node, hook)
                    allCreates.add(node)
                }
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
                    const { error, read, targets } = findWrapTargets(parents, node, allCreates)
                    if (error) scope.errors.push({ message: error, node: read })
                    else if (targets.length && scope.returned) scope.errors.push({ message: "after an early return", node: read })
                    for (const expression of targets) {
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
                && node.callee.name === imported.get("useReactive")
            ) {
                skip--
            }

            if (node.type === "ReturnStatement") {
                const scope = scopeStack.at(-1)
                if (scope) scope.returned = true
            }

            if (node === scopeStack.at(-1)?.fn) {
                scopeStack.pop()
            }

            parents.pop()
        },
    })

    for (const scope of scopes) {
        if (!isReact(scope)) continue
        if (scope.errors.length) {
            throw new Error(scope.errors.map(({ message, node }) => {
                const lines = code.slice(0, node.start).split("\n")
                const read = code.slice(node.start, node.end)
                return `${filename}:${lines.length}:${lines.at(-1)!.length + 1}: ${scope.name} reads ${read} ${message}, where it cannot become a hook. Read it before, or in a component of its own.`
            }).join("\n"))
        }
        for (const [call, hook] of scope.creates) {
            ms.overwrite(call.callee.start, call.callee.end, getImport(hook))
        }
        for (const expression of scope.expressions) {
            // useReactive(() => (expression))
            if (shouldWrap(expression)) {
                ms.appendRight(expression.start, `${getImport("useReactive")}(() => (`)
                ms.appendRight(expression.end, "))")
            }
            // useReactive(expression)
            else {
                ms.appendRight(expression.start, `${getImport("useReactive")}(`)
                ms.remove(expression.end - 2, expression.end - 1)
            }
        }
    }

    return ms.hasChanged() ? ms : undefined
}

// Only what runs on every render can become a hook:
// const $foo = Signal() and Effect() as statements of the component or hook itself.
function isTopLevel(scope: Scope, parents: Node[], call: CallExpression, hook: Hook): boolean {
    const body = scope.fn.body
    if (hook === "useSignal") {
        const [declaration, declarator] = parents.slice(-2)
        return declarator?.type === "VariableDeclarator"
            && declarator.init === call
            && declaration?.type === "VariableDeclaration"
            && parents.at(-3) === body
    }
    const statement = parents.at(-1)
    return statement?.type === "ExpressionStatement"
        && statement.expression === call
        && parents.at(-2) === body
}

// Components and hooks are told apart from other functions as React Compiler does it,
// with one difference: a read of a signal counts as a hook call, it becomes one.
// So a function only needs a fitting name, and a component also fitting params and returns.
function isReact(scope: Scope): boolean {
    if (scope.kind === "hook" || scope.kind === "callback") return true
    if (scope.kind === "component") return hasComponentParams(scope.fn.params) && !scope.returnsNonNode
    return false
}

function getKind(node: FunctionNode, parent: Node | null, reactApis: Set<string>): Scope["kind"] {
    // memo(() => {}), forwardRef(() => {})
    if (
        parent?.type === "CallExpression"
        && parent.callee !== node
        && isReactApi(parent.callee, reactApis)
    ) {
        return "callback"
    }

    const name = getName(node, parent)
    if (!name) return
    if (name.type === "Identifier" && /^[A-Z]/.test(name.name)) return "component"
    if (isHookCallee(name)) return "hook"
    return undefined
}

// function Component() {}
// const Component = () => {}
// Component = () => {}
// Foo.useHook = () => {}
// { Component: () => {} }
// function f(Component = () => {}) {}
function getName(node: FunctionNode, parent: Node | null): Node | undefined {
    if (node.type === "FunctionDeclaration") return node.id ?? undefined
    if (parent?.type === "VariableDeclarator" && parent.init === node) return parent.id
    if (parent?.type === "AssignmentExpression" && parent.right === node && parent.operator === "=") return parent.left
    if (parent?.type === "Property" && parent.value === node && !parent.computed && !parent.method) return parent.key
    if (parent?.type === "AssignmentPattern" && parent.right === node) return parent.left
    return undefined
}

// React.memo, or memo imported from react: a `memo` of signals is not one.
function isReactApi(callee: Node, reactApis: Set<string>): boolean {
    if (callee.type === "Identifier") return reactApis.has(callee.name)
    return callee.type === "MemberExpression"
        && callee.object.type === "Identifier"
        && callee.object.name === "React"
        && callee.property.type === "Identifier"
        && (callee.property.name === "memo" || callee.property.name === "forwardRef")
}

// (), (props), (props, ref)
function hasComponentParams(params: ParamPattern[]): boolean {
    if (params.length === 0) return true
    if (params.length > 2) return false
    const [props, ref] = params
    if (props!.type === "RestElement" && params.length === 1) return false
    if ("typeAnnotation" in props! && props.typeAnnotation && !isPropsType(props.typeAnnotation.typeAnnotation)) return false
    if (!ref) return true
    return ref.type === "Identifier" && /ref|Ref/.test(ref.name)
}

// Props are an object, not a number or an array.
function isPropsType(type: Node): boolean {
    switch (type.type) {
        case "TSArrayType":
        case "TSBigIntKeyword":
        case "TSBooleanKeyword":
        case "TSConstructorType":
        case "TSFunctionType":
        case "TSLiteralType":
        case "TSNeverKeyword":
        case "TSNumberKeyword":
        case "TSStringKeyword":
        case "TSSymbolKeyword":
        case "TSTupleType":
            return false
        default:
            return true
    }
}

// What a component cannot return: return {}, return () => {}, return new Foo(), return;
function isNonNode(node: Node | null | undefined): boolean {
    if (!node) return true
    if (node.type === "ParenthesizedExpression") return isNonNode(node.expression)
    switch (node.type) {
        case "ObjectExpression":
        case "ArrowFunctionExpression":
        case "FunctionExpression":
        case "ClassExpression":
        case "NewExpression":
            return true
        case "Literal":
            return typeof node.value === "bigint"
        default:
            return false
    }
}

function shouldWrap(node: JSXExpression | Expression): boolean {
    // $foo(arg) needs to be wrapped with a function: useReactive(() => $foo(arg)),
    // whereas $foo() does not: useReactive($foo).
    return !(node.type === "CallExpression" && node.arguments.length === 0)
}

interface WrapTargets {
    /** Why the read cannot become a hook. */
    error?: string
    /** The call that reads: `$foo()`, `foo.$bar.baz()` */
    read: Node
    targets: (JSXExpression | Expression)[]
}

// Walks up from a signal read to what is wrapped with `useReactive(...)`:
// the nearest variable declaration, JSX expression, hook argument, return value or if condition.
// Hooks run on every render, so a read that only runs sometimes is wrapped together with its condition,
// or reported when that condition is a statement.
function findWrapTargets(parents: Node[], read: Node, creates: Set<CallExpression>): WrapTargets {
    let readCall: Node | undefined = read.type === "CallExpression" ? read : undefined
    let child: Node = read
    let targets: (JSXExpression | Expression)[] | undefined
    // The outermost expression that only runs the read sometimes: a && $foo(), a ? $foo() : b
    let conditional: Expression | undefined
    let isConditionalAboveTargets = false
    let error: string | undefined

    for (let i = parents.length - 1; i >= 0; i--) {
        const node = parents[i]!

        // The component or hook the read is in, or a callback in it whose reads are left alone.
        if (
            node.type === "FunctionDeclaration"
            || node.type === "FunctionExpression"
            || node.type === "ArrowFunctionExpression"
        ) {
            break
        }

        // foo.$bar.baz()
        if (!readCall && node.type === "CallExpression" && node.callee === child) {
            readCall = node
        }

        if (!targets) {
            // The initial value of `useSignal()` is only read once, there is nothing to subscribe to.
            if (node.type === "CallExpression" && creates.has(node)) {
                return { read, targets: [] }
            }

            // The read sits inside a hook call: wrap the argument that contains it, not
            // the enclosing declaration, so the hook call itself is never moved into
            // `useReactive(() => (...))`.
            if (node.type === "CallExpression" && isHookCallee(node.callee)) {
                const argument = node.arguments.find((argument) => argument === child)
                // A spread argument (`useFoo(...$foo())`) can't be wrapped in place.
                if (!argument || argument.type === "SpreadElement") return { read, targets: [] }
                targets = [argument]
            }

            else if (node.type === "VariableDeclaration") {
                targets = node.declarations
                    .map((declaration) => declaration.init)
                    .filter((init): init is Expression => init != null)
            }

            else if (node.type === "JSXExpressionContainer") {
                if (node.expression.type === "JSXEmptyExpression") return { read, targets: [] }
                targets = [node.expression]
            }

            else if (node.type === "JSXSpreadAttribute") {
                targets = [node.argument]
            }

            else if (node.type === "ReturnStatement" && node.argument) {
                targets = [node.argument]
            }

            else if (node.type === "IfStatement" && node.test === child) {
                targets = [node.test]
            }
        }

        if (
            (node.type === "LogicalExpression" && node.right === child)
            || (node.type === "ConditionalExpression" && node.test !== child)
            || node.type === "ChainExpression"
        ) {
            conditional = node
            if (targets) isConditionalAboveTargets = true
        }

        if (node.type === "IfStatement" && node.test !== child) error ??= "inside an if"
        if (node.type === "SwitchStatement" && node.discriminant !== child) error ??= "inside a switch"
        if (node.type === "TryStatement") error ??= "inside a try"
        if (
            ((node.type === "ForStatement" && node.init !== child)
                || ((node.type === "ForInStatement" || node.type === "ForOfStatement") && node.right !== child)
                || node.type === "WhileStatement"
                || node.type === "DoWhileStatement")) {
                    error ??= "inside a loop"
                }

        child = node
    }

    if (!targets?.length) return { read, targets: [] }
    read = readCall ?? read
    if (error) return { error, read, targets: [] }
    if (conditional && isConditionalAboveTargets) return { read, targets: [conditional] }
    // Wrapping all of an expression with JSX would create the JSX inside a memo.
    if (!targets.some(containsJsx)) return { read, targets }
    if (conditional) return { read, targets: [conditional] }
    return { read, targets: [read as Expression] }
}

function containsJsx(node: Node): boolean {
    let found = false
    walk(node, {
        enter(node) {
            if (node.type === "JSXElement" || node.type === "JSXFragment") {
                found = true
                this.skip()
            }
        },
    })
    return found
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
        return /^use[A-Z0-9]/.test(callee.name)
    }
    if (callee.type === "MemberExpression" && callee.property.type === "Identifier") {
        return /^use[A-Z0-9]/.test(callee.property.name)
    }
    return false
}
