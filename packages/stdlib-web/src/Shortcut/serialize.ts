import type { Keystroke } from "."
import { normalize } from "./internals/normalize"

/**
 * # serialize
 *
 * ```ts
 * function Shortcut.serialize(keystrokes: Keystroke[]): string
 * ```
 *
 * The shortcut of keystrokes, the same string for the same keystrokes: modifiers in the order `meta`, `ctrl`, `alt`, `shift`, keys by the name events report. `Shortcut.parse` reads it back.
 *
 * ## Example
 *
 * ```ts
 * Shortcut.serialize(Shortcut.parse("shift+ctrl+K cmd+esc"));
 * // "ctrl+shift+k meta+Escape"
 *
 * Shortcut.serialize([Shortcut.fromEvent(event)]);
 * // "ctrl+s", to store what was recorded
 * ```
 */
export function serialize(keystrokes: Keystroke[]): string {
    return keystrokes.map(serializeKeystroke).join(" ")
}

export function serializeKeystroke(keystroke: Keystroke): string {
    const { alt, ctrl, key, meta, shift } = normalize(keystroke)
    const parts: string[] = []
    if (meta) parts.push("meta")
    if (ctrl) parts.push("ctrl")
    if (alt) parts.push("alt")
    if (shift) parts.push("shift")
    if (key !== undefined) parts.push(key)
    return parts.join("+")
}
