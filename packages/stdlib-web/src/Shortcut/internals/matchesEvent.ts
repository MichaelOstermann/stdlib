import type { Keystroke, ShortcutEvent } from ".."
import { modifierOf, nameOf } from "./keys"
import { physicalKey } from "./physicalKey"

const asciiLetterOrDigit = /^[a-z\d]$/i

/** What the event reports as its key, by the name of `Shortcut.parse`: `" "` → `Space`. */
export function keyOf(event: ShortcutEvent): string {
    const key = event.key || "Unidentified"
    return nameOf(key) ?? key
}

/** Whether the event only presses a modifier, on the way to a keystroke: ctrl, then ctrl+k. */
export function isModifierPress(event: ShortcutEvent): boolean {
    return event.key === "AltGraph" || modifierOf(event.key) !== undefined
}

/**
 * Whether the event is the normalized keystroke, see `Shortcut.matches`.
 */
export function matchesEvent(keystroke: Keystroke, event: ShortcutEvent): boolean {
    if (event.isComposing || event.key === "Process") return false

    const key = keystroke.key
    const eventKey = keyOf(event)
    const altGraph = event.getModifierState?.("AltGraph") === true

    const meta = !!keystroke.meta === event.metaKey
    const ctrlAlt = !!keystroke.ctrl === event.ctrlKey && !!keystroke.alt === event.altKey
    const shift = !!keystroke.shift === event.shiftKey

    if (!meta) return false

    // Only modifiers: { ctrl: true }
    if (key === undefined) return ctrlAlt && shift && modifierOf(eventKey) !== undefined

    // Names: Enter, ArrowDown, Numpad1, ContextMenu
    if (Array.from(key).length > 1) {
        const name = key.toLowerCase()
        return ctrlAlt && shift && (name === eventKey.toLowerCase() || name === event.code.toLowerCase())
    }

    if (asciiLetterOrDigit.test(eventKey)) return ctrlAlt && shift && key === eventKey.toLowerCase()

    // AltGr is reported as ctrl+alt on Windows, the character it types has neither.
    const typed = altGraph ? !keystroke.ctrl && !keystroke.alt : ctrlAlt
    if (typed && Array.from(eventKey).length === 1 && key === eventKey.toLowerCase()) {
        // Letters outside of the latin alphabet have a case, symbols do not.
        return eventKey.toLowerCase() === eventKey.toUpperCase() || shift
    }

    return ctrlAlt && shift && key === physicalKey(event.code)
}
