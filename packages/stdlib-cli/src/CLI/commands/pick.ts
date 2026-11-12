import type { AnyCommand } from "../types"
import { colors } from "../../internals/colors"
import { input as createInput } from "../terminal/input"
import { onKey } from "../terminal/onKey"
import { render } from "../terminal/render"

export interface PickedCommand {
    command: AnyCommand
    /** The names from `command` on to the one that was picked. */
    path: string[]
}

const VISIBLE = 10

/**
 * # pick
 *
 * ```ts
 * function CLI.commands.pick(input: { command: AnyCommand, path: string[], rpc?: AnyCommand }): Promise<PickedCommand | undefined>
 * ```
 *
 * Asks in the terminal for one of the commands below `command` that do something, all of them in
 * one list, without those under `rpc`. Typing narrows the list down, Up and Down move, Enter picks,
 * Ctrl+C clears what was typed, and when there is nothing, exits. `path` is shown in front, the
 * names that lead to `command`.
 *
 * Returns `undefined` without asking when there is nothing to pick.
 *
 * ## Example
 *
 * ```ts
 * const picked = await CLI.commands.pick({ command: members, path: ["miko", "members"] })
 * // { command: add, path: ["add"] }
 * ```
 */
export function pick(input: { command: AnyCommand, path: string[], rpc?: AnyCommand }): Promise<PickedCommand | undefined> {
    const all = commandsBelow(input.command, [], input.rpc)
    if (!all.length) return Promise.resolve(undefined)

    const text = createInput()
    const $index = Signal(0)
    const prefix = `${colors.magenta(input.path.join(" "))} `
    const nameWidth = Math.max(...all.map((entry) => Bun.stringWidth(entry.path.join(" "))))

    const stopRender = render((width, done) => {
        const shown = matches(all, text.$value())
        const index = Math.min($index(), shown.length - 1)
        const active = shown[index]
        if (done) return [`${colors.blue(input.path.join(" "))} ${active?.path.join(" ") ?? ""}`]
        const start = Math.max(0, Math.min(index - Math.floor(VISIBLE / 2), shown.length - VISIBLE))
        const rows = shown.slice(start, start + VISIBLE).map((entry) => {
            const name = entry.path.join(" ").padEnd(nameWidth, " ")
            const desc = colors.dim(firstLine(entry.command.config.desc))
            if (entry === active) return `${colors.cyan("❯")} ${name}  ${desc}`
            return `  ${name}  ${desc}`
        })
        if (!rows.length) rows.push(colors.dim("  No command matches"))
        return [prefix + text(width - Bun.stringWidth(prefix)), ...rows]
    })

    return new Promise((resolve) => {
        const stopKeys = onKey((key) => {
            if (text.onKey(key)) {
                $index(0)
                return
            }
            if (key.ctrl && key.name === "c") {
                stopKeys()
                stopRender()
                process.exit(130)
            }
            const shown = matches(all, text.$value())
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

function commandsBelow(command: AnyCommand, path: string[], rpc: AnyCommand | undefined): PickedCommand[] {
    return Object.entries(command.config.commands).flatMap(([name, child]) => {
        if (child === rpc) return []
        const childPath = [...path, name]
        const own = child.config.action ? [{ command: child, path: childPath }] : []
        return [...own, ...commandsBelow(child, childPath, rpc)]
    })
}

function matches(all: PickedCommand[], query: string): PickedCommand[] {
    if (!query) return all
    return all
        .map((entry) => ({ entry, score: String.score(`${entry.path.join(" ")} ${entry.command.config.desc ?? ""}`, query) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ entry }) => entry)
}

function firstLine(text: string | undefined): string {
    return (text ?? "").split("\n")[0]!
}
