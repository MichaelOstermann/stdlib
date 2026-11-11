import type { Key as Keypress } from "node:readline"
import { emitKeypressEvents } from "node:readline"

export interface Key {
    alt: boolean
    ctrl: boolean
    /** The name a browser gives it, `"a"`, `"A"`, `" "`, `"Enter"`, `"ArrowLeft"`, or `"Paste"`. */
    name: string
    shift: boolean
    /** What it types: the character, everything pasted, or `""`. */
    text: string
}

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
 * ```ts
 * function CLI.terminal.onKey(callback: (key: Key) => void): () => void
 * ```
 *
 * Calls `callback` with every key pressed in the terminal, and with everything pasted at once.
 * Returns what stops it. What `callback` changes counts as one change: `CLI.terminal.render` draws
 * once.
 *
 * Ctrl+C is a key like any other until it is stopped, and no longer stops the program: handle it.
 * Escape arrives half a second late, since it is also how arrow keys and Alt start.
 *
 * ## Example
 *
 * ```ts
 * const stop = CLI.terminal.onKey((key) => {
 *     if (key.ctrl && key.name === "c") process.exit(130);
 *     if (key.name === "Enter") stop();
 *     else $text($text() + key.text);
 * });
 * ```
 */
export function onKey(callback: (key: Key) => void): () => void {
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
