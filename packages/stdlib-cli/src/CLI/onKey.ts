import type { CLI } from "."
import type { Key as Keypress } from "node:readline"
import { emitKeypressEvents } from "node:readline"
import { batch } from "@monstermann/stdlib"

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
    const listener = (_: unknown, event: Keypress): void => {
        const sequence = event.sequence ?? ""
        if (event.name === "paste-start") {
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
    const restore = (): void => {
        process.stdout.write(PASTE_OFF)
    }

    emitKeypressEvents(process.stdin)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on("keypress", listener)
    process.stdout.write(PASTE_ON)
    process.on("exit", restore)

    return () => {
        process.stdin.off("keypress", listener)
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.off("exit", restore)
        restore()
    }
}
