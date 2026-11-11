import type { Input } from "./input"
import { colors } from "../../internals/colors"
import { CURSOR } from "../../internals/cursor"
import { Parse } from "../../internals/Parse"
import { input } from "./input"
import { onKey } from "./onKey"
import { render } from "./render"

export interface PromptOptions {
    footer?: PromptSlot
    header?: PromptSlot
    /** The value it starts with. */
    initial?: string
    /** Shown dimmed while there is no value. */
    placeholder?: string
    prefix?: PromptSlot
    suffix?: PromptSlot
}

/** Lines to draw, with `done` set once the value was accepted. Nothing draws nothing. */
export type PromptSlot = (input: Input, done: boolean) => string | null | undefined | void

/**
 * # prompt
 *
 * ```ts
 * function CLI.terminal.prompt(options: PromptOptions): Promise<string>
 * function CLI.terminal.prompt<T>(options: PromptOptions & { parse: Parse<T> }): Promise<T>
 * ```
 *
 * Asks for a line of text, between `prefix` and `suffix`, with `header` above and `footer` below.
 * `parse` checks the `initial` value right away and the value on Enter, and sets `input.$error`,
 * which typing clears. Enter returns the value once `parse` accepts it. Ctrl+C clears the value,
 * and when there is none, exits.
 *
 * ## Example
 *
 * ```ts
 * const seats = await CLI.terminal.prompt({
 *     footer: (input, done) => done ? undefined : input.$error(),
 *     initial: "1",
 *     parse: (value) => Number.isInteger(Number(value)) ? Ok(Number(value)) : Err("Must be a whole number"),
 *     prefix: () => "Seats: ",
 * })
 * ```
 */
export function prompt(options: PromptOptions): Promise<string>
export function prompt<T>(options: PromptOptions & { parse: Parse<T> }): Promise<T>
export function prompt(options: PromptOptions & { parse?: Parse<unknown> }): Promise<unknown> {
    const parse = options.parse ?? ((value: string) => Ok(value))
    const text = input()
    if (options.initial) text.insertText(options.initial)

    const check = async (value: string): Promise<Result<unknown, string[]>> => {
        const result = await Parse.value(parse, value)
        if (text.$value() === value) text.$error(result.ok ? undefined : result.value.join("\n"))
        return result
    }

    const stopClearing = Effect(() => {
        text.$value()
        text.$error(undefined)
    })

    if (options.initial) void check(options.initial)

    const stopRender = render((width, done) => {
        const prefix = options.prefix?.(text, done) || ""
        const suffix = options.suffix?.(text, done) || ""
        const room = width - Bun.stringWidth(prefix) - Bun.stringWidth(suffix)
        const field = !done && !text.$value() && options.placeholder
            ? CURSOR + colors.dim(Bun.sliceAnsi(options.placeholder, 0, room))
            : text(room)
        return [
            ...lines(options.header?.(text, done), width),
            prefix + field + suffix,
            ...lines(options.footer?.(text, done), width),
        ]
    })

    return new Promise((resolve) => {
        let finished = false
        const stopKeys = onKey((key) => {
            if (text.onKey(key)) return
            if (key.ctrl && key.name === "c") {
                stopKeys()
                stopRender()
                process.exit(130)
            }
            if (key.name !== "Enter") return
            const submitted = text.$value()
            void check(submitted).then((result) => {
                if (finished) return
                if (submitted !== text.$value()) return
                if (!result.ok) return
                finished = true
                stopClearing()
                stopKeys()
                stopRender()
                resolve(result.value)
            })
        })
    })
}

function lines(slot: string | null | undefined | void, width: number): string[] {
    if (slot == null) return []
    return Bun
        .wrapAnsi(slot, width)
        .split("\n")
}
