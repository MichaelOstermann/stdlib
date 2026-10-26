import type { Node } from "oxc-parser"
import type { Chain, Step } from "./types"

/**
 * Collects the calls of a `match(value).case(…).unwrapOr(…)` chain, `local` being the name `match`
 * is imported as.
 */
export function collectChain(node: Node, local: string): Chain | undefined {
    const last = method(node)
    if (!last || !isEnd(last.name)) return

    const steps: Step[] = []
    let call = node
    for (let step = method(call); step; step = method(call)) {
        if (isEnd(step.name)) {
            // Only as the end of the chain.
            if (steps.length) return
            steps.unshift({ args: step.args, name: step.name })
        }
        else if (step.name === "case" || step.name === "onCase" || step.name === "shape" || step.name === "onShape" || step.name === "cond" || step.name === "onCond") {
            steps.unshift({ args: step.args, name: step.name })
        }
        else if (step.name !== "returnType") {
            return
        }
        call = step.object
    }

    if (call.type !== "CallExpression" || call.optional || call.callee.type !== "Identifier" || call.callee.name !== local) return
    const subject = call.arguments[0]
    if (!subject || call.arguments.length !== 1 || subject.type === "SpreadElement") return

    return { steps, subject }
}

function isEnd(name: string): name is "unwrap" | "unwrapOr" | "unwrapOrElse" {
    return name === "unwrap" || name === "unwrapOr" || name === "unwrapOrElse"
}

function method(node: Node): { args: Node[], name: string, object: Node } | undefined {
    if (node.type !== "CallExpression" || node.optional) return
    const callee = node.callee
    if (callee.type !== "MemberExpression" || callee.computed || callee.optional || callee.property.type !== "Identifier") return
    return { args: node.arguments, name: callee.property.name, object: callee.object }
}
