import type { ResolvedCommand } from "../types"
import { Signal, String } from "@monstermann/stdlib"
import { ansi } from "../ansi"
import { term } from "../term"

const VISIBLE = 10

/**
 * # command
 *
 * Asks to pick one of `commands`, with search.
 *
 * ## Example
 *
 * ```ts
 * const picked = await CLI.prompt.command(CLI.commands.pickable(CLI.commands.nearest(miko, [])))
 * ```
 */
export function command(commands: ResolvedCommand[]): Promise<ResolvedCommand> {
    const text = term.input()
    const $index = Signal(0)
    const nameWidth = Math.max(...commands.map((entry) => Bun.stringWidth(entry.path.join(" "))))

    const stopRender = term.render((width, done) => {
        const shown = matches(commands, text.$value())
        const index = Math.min($index(), shown.length - 1)
        const active = shown[index]
        if (done) return [ansi.blue(active?.path.join(" ") ?? "")]
        const start = Math.max(0, Math.min(index - Math.floor(VISIBLE / 2), shown.length - VISIBLE))
        const rows = shown.slice(start, start + VISIBLE).map((entry) => {
            const name = entry.path.join(" ").padEnd(nameWidth, " ")
            const desc = ansi.dim(firstLine(entry.command.config.desc))
            if (entry === active) return `${ansi.cyan("❯")} ${name}  ${desc}`
            return `  ${name}  ${desc}`
        })
        if (!rows.length) rows.push(ansi.dim("  No command matches"))
        return [text(width), ...rows]
    })

    return new Promise((resolve) => {
        const stopKeys = term.onKey((key) => {
            if (text.onKey(key)) {
                $index(0)
                return
            }
            if (key.ctrl && key.name === "c") {
                stopKeys()
                stopRender()
                process.exit(130)
            }
            const shown = matches(commands, text.$value())
            if (key.name === "ArrowUp") $index((Math.min($index(), shown.length - 1) - 1 + shown.length) % shown.length)
            if (key.name === "ArrowDown") $index((Math.min($index(), shown.length - 1) + 1) % shown.length)
            if (key.name !== "Enter") return
            const picked = shown[Math.min($index(), shown.length - 1)]
            if (!picked) return
            stopKeys()
            stopRender()
            resolve(picked)
        })
    })
}

function matches(commands: ResolvedCommand[], query: string): ResolvedCommand[] {
    if (!query) return commands
    return commands
        .map((entry) => ({ entry, score: String.score(`${entry.path.join(" ")} ${entry.command.config.desc ?? ""}`, query) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ entry }) => entry)
}

function firstLine(text: string | undefined): string {
    return (text ?? "").split("\n")[0]!
}
