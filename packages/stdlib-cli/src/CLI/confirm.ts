import type { CLI } from "."
import { Signal } from "@monstermann/stdlib"
import { green } from "./green"
import { onKey } from "./onKey"
import { red } from "./red"
import { render } from "./render"
import { underline } from "./underline"

/**
 * # confirm
 *
 * Asks yes or no.
 *
 * ## Example
 *
 * ```ts
 * const notify = await CLI.confirm({ prefix: () => "Send them an email? " })
 * ```
 */
export function confirm(options: CLI.ConfirmOptions): Promise<boolean> {
    const answer = options.answer ?? defaultAnswer
    const $value = Signal(options.initial ?? false)

    const stopRender = render((_, done) => {
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
        const stopKeys = onKey((key) => {
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
    if (value) return `${green(underline("Yes"))} / No`
    return `Yes / ${red(underline("No"))}`
}

function lines(slot: string | null | undefined | void): string[] {
    return slot ? slot.split("\n") : []
}
