import type { CLI } from "."
import type { Key as Keypress } from "node:readline"
import { emitKeypressEvents } from "node:readline"
import { batch } from "@monstermann/stdlib"
import { acquireRawInput } from "../internals/rawInput"
import { onTerminalCleanup } from "../internals/terminalCleanup"

const NAMES: Record<string, string> = {
    backspace: "Backspace",
    delete: "Delete",
    down: "ArrowDown",
    end: "End",
    enter: "Enter",
    escape: "Escape",
    home: "Home",
    insert: "Insert",
    left: "ArrowLeft",
    pagedown: "PageDown",
    pageup: "PageUp",
    return: "Enter",
    right: "ArrowRight",
    tab: "Tab",
    up: "ArrowUp",
}

const PASTE_ON = "\x1b[?2004h"
const PASTE_OFF = "\x1b[?2004l"

/**
 * # onKey
 *
 * Calls `callback` for each key press. Returns a function that stops listening. While listening,
 * Ctrl+C does not exit.
 *
 * ## Example
 *
 * ```ts
 * const stop = CLI.onKey((key) => {
 *     if (key.ctrl && key.name === "c") process.exit(130);
 *     if (key.name === "Enter") stop();
 *     else $text($text() + key.text);
 * });
 * ```
 */
export function onKey(callback: (key: CLI.Key) => void): () => void {
    let pasted: string | undefined
    let inMouseEvent = false
    const listener = (_: unknown, event: Keypress): void => {
        const sequence = event.sequence ?? ""
        // readline splits a mouse event into keys: `\x1b[<`, the digits and `;`, then `M` or `m`.
        if (sequence === "\x1b[<") {
            inMouseEvent = true
        }
        else if (inMouseEvent) {
            inMouseEvent = sequence !== "M" && sequence !== "m"
        }
        else if (event.name === "paste-start") {
            pasted = ""
        }
        else if (event.name === "paste-end") {
            const text = pasted!
            batch(() => callback({ alt: false, ctrl: false, name: "Paste", shift: false, text }))
            pasted = undefined
        }
        else if (pasted !== undefined) {
            pasted += sequence
        }
        else {
            // A character, not a control code or an escape sequence.
            const typed = !event.ctrl && !event.meta && sequence >= " " && sequence !== "\x7f"
            batch(() => callback({
                alt: !!event.meta,
                // Backspace is `\x7f`, with Ctrl it is `\b`, which readline takes for Backspace too.
                ctrl: !!event.ctrl || sequence.endsWith("\b"),
                name: typed ? sequence : NAMES[event.name!] ?? event.name ?? sequence,
                shift: !!event.shift,
                text: typed ? sequence : "",
            }))
        }
    }
    emitKeypressEvents(process.stdin)
    const releaseRawInput = acquireRawInput()
    process.stdin.on("keypress", listener)
    process.stdout.write(PASTE_ON)

    return onTerminalCleanup(() => {
        process.stdin.off("keypress", listener)
        releaseRawInput()
        process.stdout.write(PASTE_OFF)
    })
}
