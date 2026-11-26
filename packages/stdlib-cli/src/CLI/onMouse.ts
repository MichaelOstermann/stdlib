import type { CLI } from "."
import { batch } from "@monstermann/stdlib"
import { acquireRawInput } from "../internals/rawInput"
import { onTerminalCleanup } from "../internals/terminalCleanup"

const MOUSE_ON = "\x1b[?1000h\x1b[?1006h"
const MOUSE_OFF = "\x1b[?1000l\x1b[?1006l"
const MOUSE_EVENT_START = "\x1b[<"
const MOUSE_EVENT_REST = /^(\d+);(\d+);(\d+)(m)/i
const WHEEL_NAMES = ["WheelUp", "WheelDown", "WheelLeft", "WheelRight"] as const

/**
 * # onMouse
 *
 * Calls `callback` for each click and each turn of the wheel. Returns a function that stops
 * listening. While listening, the terminal selects text only with Shift held down.
 *
 * ## Example
 *
 * ```ts
 * CLI.onMouse((mouse) => {
 *     if (mouse.name === "WheelUp") $scroll((scroll) => scroll - 1);
 *     if (mouse.name === "WheelDown") $scroll((scroll) => scroll + 1);
 * });
 * ```
 */
export function onMouse(callback: (mouse: CLI.Mouse) => void): () => void {
    const listener = (data: Buffer): void => {
        for (const part of data.toString().split(MOUSE_EVENT_START).slice(1)) {
            const match = MOUSE_EVENT_REST.exec(part)
            if (!match) continue
            const [, code, x, y, kind] = match
            batch(() => callback(mouseOf(Number(code), Number(x) - 1, Number(y) - 1, kind === "M")))
        }
    }
    const releaseRawInput = acquireRawInput()
    process.stdin.on("data", listener)
    process.stdout.write(MOUSE_ON)

    return onTerminalCleanup(() => {
        process.stdin.off("data", listener)
        releaseRawInput()
        process.stdout.write(MOUSE_OFF)
    })
}

/** Reads the bits of `code`: the button in the lowest two, then Shift, Alt, Ctrl, and the wheel. */
function mouseOf(code: number, x: number, y: number, pressed: boolean): CLI.Mouse {
    const modifiers = { alt: (code & 8) !== 0, ctrl: (code & 16) !== 0, shift: (code & 4) !== 0, x, y }
    if (code & 64) return { ...modifiers, button: 0, name: WHEEL_NAMES[code & 3]! }
    return { ...modifiers, button: code & 3, name: pressed ? "MouseDown" : "MouseUp" }
}
