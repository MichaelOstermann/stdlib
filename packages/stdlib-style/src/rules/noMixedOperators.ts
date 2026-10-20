// Operators that are easy to misread next to each other, although the language is clear about them:
// `a && b || c` and `a === b > c`. Writing the parentheses makes whoever wrote it decide what they meant.

export interface Node {
    operator: string
    parent?: Node
    range: [number, number]
    type: string
}

export interface Token {
    value: string
}

export interface Context {
    sourceCode: {
        getTokenAfter: (node: Node) => Token | null
        getTokenBefore: (node: Node) => Token | null
    }
    report: (descriptor: { data: Record<string, string>, messageId: string, node: Node }) => void
}

type Family = "and" | "equality" | "or" | "relational"

const families: Record<string, Family> = {
    "!=": "equality",
    "!==": "equality",
    "&&": "and",
    "<": "relational",
    "<=": "relational",
    "==": "equality",
    "===": "equality",
    ">": "relational",
    ">=": "relational",
    "||": "or",
}

const mixes: Record<Family, Family> = {
    and: "or",
    equality: "relational",
    or: "and",
    relational: "equality",
}

function isOperation(node: Node | undefined): node is Node {
    return node?.type === "BinaryExpression" || node?.type === "LogicalExpression"
}

export const noMixedOperators = {
    meta: {
        schema: [],
        type: "suggestion",
        docs: {
            description: "Require parentheses when `&&` meets `||`, or `===` meets `<`",
        },
        messages: {
            mixed: "Unexpected mix of '{{child}}' and '{{parent}}'. Add parentheses to say which goes first.",
        },
    },
    create(context: Context) {
        function check(node: Node): void {
            const parent = node.parent
            if (!isOperation(parent)) return

            const family = families[node.operator]
            if (!family || families[parent.operator] !== mixes[family]) return

            const before = context.sourceCode.getTokenBefore(node)
            const after = context.sourceCode.getTokenAfter(node)
            if (before?.value === "(" && after?.value === ")") return

            context.report({ data: { child: node.operator, parent: parent.operator }, messageId: "mixed", node })
        }

        return {
            BinaryExpression: check,
            LogicalExpression: check,
        }
    },
}
