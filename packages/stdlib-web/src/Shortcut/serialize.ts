import type { Keystroke } from "."
import { normalize } from "./internals/normalize"

/**
 * # serialize
 *
 * Returns the shortcut string of keystrokes. The same keystrokes always give the same string:
 * modifiers in the order `meta`, `ctrl`, `alt`, `shift`, and keys by the name events report.
 * `Shortcut.parse` reads the string back.
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
    if (key) parts.push(key)
    return parts.join("+")
}
