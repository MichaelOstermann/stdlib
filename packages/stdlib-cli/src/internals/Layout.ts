import { ansi } from "../CLI/ansi"

export const Layout = {
    paragraphs(texts: string[]): string {
        return texts.filter(Boolean).join("\n\n")
    },
    row(left: string, right: string, leftWidth: number): string {
        const padding = " ".repeat(Math.max(0, leftWidth - Bun.stringWidth(left)))
        const indent = " ".repeat(2 + leftWidth + 2)
        const rightWidth = Math.max((process.stdout.columns ?? Infinity) - indent.length, 20)
        const wrapped = Bun.wrapAnsi(right, rightWidth, { hard: true }).replaceAll("\n", `\n${indent}`)
        return `  ${left}${padding}  ${wrapped}`.trimEnd()
    },
    section(title: string, rows: string[]): string {
        if (!rows.length) return ""
        return `${ansi.bold(`${title}:`)}\n${rows.join("\n")}`
    },
}
