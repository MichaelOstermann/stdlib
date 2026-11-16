import { ansi } from "../ansi"
import { term } from "../term"

export interface SelectOptions<K extends string> {
    choices: readonly K[]
    footer?: SelectSlot<K>
    header?: SelectSlot<K>
    /** The choice it starts on. */
    initial?: K
    /** One line for each choice, `active` for the one Enter picks. */
    choice?: (key: K, active: boolean) => string
}

/**
 * Lines to draw, with `done` set once `active` was picked, when the choices are no longer shown.
 */
export type SelectSlot<K extends string> = (active: K, done: boolean) => string | null | undefined | void

/**
 * # select
 *
 * Asks to pick one of `choices`.
 *
 * ## Example
 *
 * ```ts
 * const role = await CLI.prompt.select({
 *     choices: ["admin", "member"],
 *     header: (active, done) => done ? `Role: ${active}` : "Role:",
 *     initial: "member",
 * })
 * ```
 */
export function select<const K extends string>(options: SelectOptions<K>): Promise<K> {
    const choice = options.choice ?? ((key: K, active: boolean) => active ? `${ansi.cyan("❯")} ${key}` : `  ${key}`)
    const $index = Signal(Math.max(0, options.choices.indexOf(options.initial!)))

    const stopRender = term.render((_, done) => {
        const active = options.choices[$index()]!
        if (done) return [...lines(options.header?.(active, true)), ...lines(options.footer?.(active, true))]
        return [
            ...lines(options.header?.(active, false)),
            ...options.choices.map((key) => choice(key, key === active)),
            ...lines(options.footer?.(active, false)),
        ]
    })

    return new Promise((resolve) => {
        const stopKeys = term.onKey((key) => {
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
