import { colors } from "../../internals/colors"
import { onKey } from "./onKey"
import { render } from "./render"

export interface ConfirmOptions {
    footer?: ConfirmSlot
    header?: ConfirmSlot
    /** The answer it starts on, `false` when not given. */
    initial?: boolean
    prefix?: ConfirmSlot
    suffix?: ConfirmSlot
    /** The answers between `prefix` and `suffix`, `value` for the one Enter picks. */
    answer?: (value: boolean, done: boolean) => string
}

/** Lines to draw, with `done` set once `value` was picked. Nothing draws nothing. */
export type ConfirmSlot = (value: boolean, done: boolean) => string | null | undefined | void

/**
 * # confirm
 *
 * ```ts
 * function CLI.terminal.confirm(options: ConfirmOptions): Promise<boolean>
 * ```
 *
 * Asks yes or no on one line, between `prefix` and `suffix`, with `header` above and `footer`
 * below. Y and N answer right away, Left, Right and Tab switch, Enter picks, Ctrl+C exits.
 *
 * ## Example
 *
 * ```ts
 * const notify = await CLI.terminal.confirm({ prefix: () => "Send them an email? " })
 * ```
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
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
            if (key.name === "y" || key.name === "Y") $value(true)
            if (key.name === "n" || key.name === "N") $value(false)
            if (key.name !== "Enter" && key.name.toLowerCase() !== "y" && key.name.toLowerCase() !== "n") return
            stopKeys()
            stopRender()
            resolve($value())
        })
    })
}

function defaultAnswer(value: boolean, done: boolean): string {
    if (done && value) return "Yes"
    if (done) return "No"
    if (value) return `${colors.green(colors.underline("Yes"))} / No`
    return `Yes / ${colors.red(colors.underline("No"))}`
}

function lines(slot: string | null | undefined | void): string[] {
    return slot ? slot.split("\n") : []
}
