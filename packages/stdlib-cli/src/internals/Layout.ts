import { colors } from "./colors"

export const Layout = {
    paragraphs(texts: string[]): string {
        return texts.filter(Boolean).join("\n\n")
    },
    section(title: string, rows: [left: string, right: string][]): string {
        if (!rows.length) return ""
        return `${colors.bold(`${title}:`)}\n${Layout.table(rows)}`
    },
    table(rows: [left: string, right: string][]): string {
        const leftWidth = Math.max(...rows.map(([left]) => Bun.stringWidth(left)))
        const indent = " ".repeat(2 + leftWidth + 2)
        const rightWidth = Math.max((process.stdout.columns ?? Infinity) - indent.length, 20)
        return rows
            .map(([left, right]) => {
                const padding = " ".repeat(leftWidth - Bun.stringWidth(left))
                const wrapped = Bun.wrapAnsi(right, rightWidth, { hard: true }).replaceAll("\n", `\n${indent}`)
                return `  ${left}${padding}  ${wrapped}`.trimEnd()
            })
            .join("\n")
    },
}
