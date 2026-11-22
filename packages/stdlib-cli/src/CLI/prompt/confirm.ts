import { Signal } from "@monstermann/stdlib"
import { ansi } from "../ansi"
import { term } from "../term"

export interface ConfirmOptions {
    footer?: ConfirmSlot
    header?: ConfirmSlot
    /** The answer selected at the start. Defaults to `false`. */
    initial?: boolean
    prefix?: ConfirmSlot
    suffix?: ConfirmSlot
    /** Draws the answers between `prefix` and `suffix`. `value` is the answer that Enter picks. */
    answer?: (value: boolean, done: boolean) => string
}

/**
 * Returns the lines to draw. `done` is `true` after `value` was picked. Returning nothing draws
 * nothing.
 */
export type ConfirmSlot = (value: boolean, done: boolean) => string | null | undefined | void

/**
 * # confirm
 *
 * Asks yes or no.
 *
 * ## Example
 *
 * ```ts
 * const notify = await CLI.prompt.confirm({ prefix: () => "Send them an email? " })
 * ```
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
    const answer = options.answer ?? defaultAnswer
    const $value = Signal(options.initial ?? false)

    const stopRender = term.render((_, done) => {
        const value = $value()
        const prefix = options.prefix?.(value, done) || ""
        const suffix = options.suffix?.(value, done) || ""
        return [
            ...lines(options.header?.(value, done)),
            prefix + answer(value, done) + suffix,
            ...lines(options.footer?.(value, done)),
        ]
    })

    return new Promise((resolve) => {
        const stopKeys = term.onKey((key) => {
            if (key.ctrl && key.name === "c") {
                stopKeys()
                stopRender()
                process.exit(130)
            }
            if (key.name === "ArrowLeft" || key.name === "ArrowRight" || key.name === "Tab") $value(!$value())
            const letter = key.text.toLowerCase()
            if (letter === "y") $value(true)
            if (letter === "n") $value(false)
            if (key.name !== "Enter" && letter !== "y" && letter !== "n") return
            stopKeys()
            stopRender()
            resolve($value())
        })
    })
}

function defaultAnswer(value: boolean, done: boolean): string {
    if (done && value) return "Yes"
    if (done) return "No"
    if (value) return `${ansi.green(ansi.underline("Yes"))} / No`
    return `Yes / ${ansi.red(ansi.underline("No"))}`
}

function lines(slot: string | null | undefined | void): string[] {
    return slot ? slot.split("\n") : []
}
