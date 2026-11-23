import type { CLI } from "."
import { Signal } from "@monstermann/stdlib"
import { cyan } from "./cyan"
import { onKey } from "./onKey"
import { render } from "./render"

/**
 * # select
 *
 * Asks to pick one of `choices`.
 *
 * ## Example
 *
 * ```ts
 * const role = await CLI.select({
 *     choices: ["admin", "member"],
 *     header: (active, done) => done ? `Role: ${active}` : "Role:",
 *     initial: "member",
 * })
 * ```
 */
export function select<const K extends string>(options: CLI.SelectOptions<K>): Promise<K> {
    const choice = options.choice ?? ((key: K, active: boolean) => active ? `${cyan("❯")} ${key}` : `  ${key}`)
    const $index = Signal(Math.max(0, options.choices.indexOf(options.initial!)))

    const stopRender = render((_, done) => {
        const active = options.choices[$index()]!
        if (done) return [...lines(options.header?.(active, true)), ...lines(options.footer?.(active, true))]
        return [
            ...lines(options.header?.(active, false)),
            ...options.choices.map((key) => choice(key, key === active)),
            ...lines(options.footer?.(active, false)),
        ]
    })

    return new Promise((resolve) => {
        const stopKeys = onKey((key) => {
            if (key.ctrl && key.name === "c") {
                stopKeys()
                stopRender()
                process.exit(130)
            }
            if (key.name === "ArrowUp") $index(($index() - 1 + options.choices.length) % options.choices.length)
            if (key.name === "ArrowDown") $index(($index() + 1) % options.choices.length)
            if (key.name !== "Enter") return
            stopKeys()
            stopRender()
            resolve(options.choices[$index()]!)
        })
    })
}

function lines(slot: string | null | undefined | void): string[] {
    return slot ? slot.split("\n") : []
}
