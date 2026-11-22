import type { Result } from "@monstermann/stdlib"
import type { Input } from "../term/input"
import { Effect, Ok } from "@monstermann/stdlib"
import { CURSOR } from "../../internals/cursor"
import { Parse } from "../../internals/Parse"
import { ansi } from "../ansi"
import { term } from "../term"

export interface TextOptions {
    footer?: TextSlot
    header?: TextSlot
    /** The value at the start. */
    initial?: string
    /** Drawn in place of each character, like `*` for a password. */
    mask?: string
    /** Shown dimmed while there is no value. */
    placeholder?: string
    prefix?: TextSlot
    suffix?: TextSlot
}

/** Returns the lines to draw. `done` is `true` after the value was accepted. Returning nothing draws nothing. */
export type TextSlot = (input: Input, done: boolean) => string | null | undefined | void

/**
 * # text
 *
 * Asks for a line of text. `parse` checks the text on Enter. When `parse` rejects the text, the
 * message is in `input.$error()`.
 *
 * ## Example
 *
 * ```ts
 * const seats = await CLI.prompt.text({
 *     footer: (input, done) => done ? undefined : input.$error(),
 *     initial: "1",
 *     parse: (value) => Number.isInteger(Number(value)) ? Ok(Number(value)) : Err("Must be a whole number"),
 *     prefix: () => "Seats: ",
 * })
 * ```
 */
export function text(options: TextOptions): Promise<string>
export function text<T>(options: TextOptions & { parse: Parse<T> }): Promise<T>
export function text(options: TextOptions & { parse?: Parse<unknown> }): Promise<unknown> {
    const parse = options.parse ?? ((value: string) => Ok(value))
    const text = term.input({ mask: options.mask })
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

    const stopRender = term.render((width, done) => {
        const prefix = options.prefix?.(text, done) || ""
        const suffix = options.suffix?.(text, done) || ""
        const room = width - Bun.stringWidth(prefix) - Bun.stringWidth(suffix)
        const field = !done && !text.$value() && options.placeholder
            ? CURSOR + ansi.dim(Bun.sliceAnsi(options.placeholder, 0, room))
            : text(room)
        return [
            ...lines(options.header?.(text, done), width),
            prefix + field + suffix,
            ...lines(options.footer?.(text, done), width),
        ]
    })

    return new Promise((resolve) => {
        let finished = false
        const stopKeys = term.onKey((key) => {
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
