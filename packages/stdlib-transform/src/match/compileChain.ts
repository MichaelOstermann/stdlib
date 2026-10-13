import type { Node } from "oxc-parser"
import type { Chain, Context, Subject } from "./types"
import { walk } from "oxc-walker"
import { compileShape } from "./compileShape"
import { abort, unwrap } from "./helpers"
import { isFunction, transformCallback } from "./transformCallback"

/** Turns a chain into a conditional expression. */
export function compileChain(node: Node, chain: Chain, ctx: Context): string {
    const src = (node: Node): string => ctx.code.slice(node.start, node.end)

    // A value that is not a stable name is evaluated once and passed as the argument of a function.
    const params: string[] = []
    const args: string[] = []
    const bind = (value: Node): string => {
        // Only a stable name is reused: the chain matches the value from when it started, even if the name is assigned to later.
        if (value.type === "Identifier" && ctx.isStable(value.name)) return value.name
        const id = ctx.id("match")
        params.push(id)
        args.push(src(value))
        return id
    }

    const elements = chain.subject.type === "ArrayExpression" ? chain.subject.elements : undefined
    const subject: Subject = elements?.every(element => element && element.type !== "SpreadElement")
        ? { kind: "tuple", names: elements.map(element => bind(element!)) }
        : { kind: "value", name: bind(chain.subject) }

    // `await` and `yield` can not be moved into a function.
    if (params.length && hasAwaitOrYield(node)) abort()

    const branches: string[] = []
    for (const step of chain.steps) {
        if (step.args.some(arg => arg.type === "SpreadElement")) abort()

        if (step.name === "case" || step.name === "onCase" || step.name === "shape" || step.name === "onShape") {
            const result = step.args.at(-1)
            const patterns = step.args.slice(0, -1)
            if (!result || !patterns.length) abort()
            const isCase = step.name === "case" || step.name === "onCase"
            // An array that has just been created is not the same as anything.
            const tests = patterns.map(pattern => !isCase ? compileShape(subject, pattern, ctx) : subject.kind === "value" ? `(${subject.name} === (${src(pattern)}))` : "false")
            const test = tests.length > 1 ? `(${tests.join(" || ")})` : tests[0]
            branches.push(`${test} ? (${step.name === "case" || step.name === "shape" ? src(result) : compileCall(subject, result, ctx)})`)
        }

        else if (step.name === "cond" || step.name === "onCond") {
            const [predicate, result] = step.args
            if (!predicate || !result || step.args.length !== 2) abort()
            branches.push(`(${compileCall(subject, predicate, ctx)}) ? (${step.name === "cond" ? src(result) : compileCall(subject, result, ctx)})`)
        }

        else if (step.name === "unwrapOr") {
            const [result] = step.args
            if (!result || step.args.length !== 1) abort()
            // As the whole chain, the result may be called right away. `(0, a.b)` keeps that call from passing `a` as `this`, which `(a.b)` would do.
            branches.push(chain.steps.length > 1 ? `(${src(result)})` : `(0, ${src(result)})`)
        }

        else if (step.name === "unwrapOrElse") {
            const [fn] = step.args
            if (!fn || step.args.length !== 1) abort()
            branches.push(`(${compileCall(subject, fn, ctx)})`)
        }

        else {
            branches.push(`${ctx.helper("throwUnmatched")}(${valueOf(subject)})`)
        }
    }

    const result = branches.join("\n: ")
    return params.length
        ? `((${params.join(", ")}) => ${result})(${args.join(", ")})`
        : `(${result})`
}

/** Calls a function with the value. */
function compileCall(subject: Subject, fn: Node, ctx: Context): string {
    const node = unwrap(fn)
    if (subject.kind === "value") return transformCallback(subject.name, node, ctx)
    // The array is only needed by callbacks that ask for it.
    if (node.type === "ArrowFunctionExpression" && !node.async && node.params.length === 0) return transformCallback("", node, ctx)
    // A method is called without the object it belongs to, the same way it is when being passed along.
    return isFunction(node) || node.type === "Identifier"
        ? `(${ctx.code.slice(fn.start, fn.end)})(${valueOf(subject)})`
        : `(0, ${ctx.code.slice(fn.start, fn.end)})(${valueOf(subject)})`
}

function valueOf(subject: Subject): string {
    return subject.kind === "tuple" ? `[${subject.names.join(", ")}]` : subject.name
}

/** Whether a chain awaits or yields, other than inside of its callbacks. */
export function hasAwaitOrYield(root: Node): boolean {
    let result = false
    walk(root, {
        enter(node) {
            if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") this.skip()
            else if (node.type === "AwaitExpression" || node.type === "YieldExpression") result = true
        },
    })
    return result
}
