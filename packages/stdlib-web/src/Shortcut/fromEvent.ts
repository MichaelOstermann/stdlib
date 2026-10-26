import type { Keystroke, ShortcutEvent } from "."
import { isModifierPress, keyOf } from "./internals/matchesEvent"
import { normalize } from "./internals/normalize"
import { physicalKey } from "./internals/physicalKey"

const asciiLetterOrDigit = /^[a-z\d]$/i

/**
 * # fromEvent
 *
 * ```ts
 * function Shortcut.fromEvent(event: KeyboardEvent): Keystroke
 * ```
 *
 * The keystroke of an event, the one that `Shortcut.matches` takes the same event for, eg. to
 * record a shortcut that the user picks.
 *
 * - Latin letters and digits as reported, without caps lock: `ctrl+z` on a German layout too
 * - With ctrl, alt or meta, other keys by their position: `ctrl+c` on a cyrillic layout, `alt+a` on
 *   macOS where it types "å"
 * - Otherwise what is typed, with `shift` only for letters that have a case: `?`, `@` with AltGr,
 *   `shift+ö`
 * - A modifier on its own is the modifiers that are held, with `key` as `""`
 *
 * ## Example
 *
 * ```ts
 * input.addEventListener("keydown", (event) => {
 *     event.preventDefault();
 *     if (Shortcut.matches("esc", event)) return input.blur();
 *     const keystroke = Shortcut.fromEvent(event);
 *     if (keystroke.key) setShortcut(Shortcut.serialize([keystroke]));
 * });
 * ```
 */
export function fromEvent(event: ShortcutEvent): Keystroke {
    const keystroke: Keystroke = {
        alt: event.altKey,
        ctrl: event.ctrlKey,
        key: "",
        meta: event.metaKey,
        shift: event.shiftKey,
    }
    if (isModifierPress(event)) return normalize(keystroke)

    const key = keyOf(event)
    const character = Array.from(key).length === 1
    const altGraph = event.getModifierState?.("AltGraph") === true
    const physical = physicalKey(event.code)
    const modified = (event.ctrlKey || event.altKey || event.metaKey) && !altGraph

    // Enter, Numpad1, ContextMenu
    if (!character && key !== "Dead" && key !== "Unidentified") {
        keystroke.key = key
    }
    // Caps lock types an uppercase letter without shift.
    else if (asciiLetterOrDigit.test(key)) {
        keystroke.key = key.toLowerCase()
    }
    // A dead key, or a modifier that changes what is typed: alt+a types "å" on macOS, ctrl+c types "с" on a cyrillic layout.
    else if (physical && (!character || modified)) {
        keystroke.key = physical
    }
    else {
        // AltGr is reported as ctrl+alt on Windows, the character it types has neither.
        if (altGraph) keystroke.ctrl = keystroke.alt = false
        // Symbols need shift on some layouts and not on others, letters outside of the latin alphabet have a case.
        keystroke.shift = event.shiftKey && key.toLowerCase() !== key.toUpperCase()
        keystroke.key = key.toLowerCase()
    }

    return normalize(keystroke)
}
