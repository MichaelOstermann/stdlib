import type { Keystroke, ShortcutEvent } from "."
import { isModifierPress, matchesEvent } from "./internals/matchesEvent"
import { normalize } from "./internals/normalize"
import { parse } from "./parse"
import { serializeKeystroke } from "./serialize"

/**
 * # matches
 *
 * ```ts
 * function Shortcut.matches(
 *     shortcut: string | Keystroke[],
 *     input: string | Keystroke[] | KeyboardEvent | KeyboardEvent[],
 * ): boolean | "partial"
 * ```
 *
 * Whether `input` is `shortcut`: `true` when it is all of it, `"partial"` when it is the beginning
 * of it and more has to come, `false` otherwise.
 *
 * `input` is what was pressed so far, the events since the last match, or another shortcut, eg. to
 * tell which bindings a recorded shortcut conflicts with.
 *
 * Against events:
 *
 * - `ctrl`, `alt` and `meta` have to be exactly as the shortcut says.
 * - When the event reports a latin letter or a digit, that is what is compared, and `shift` has to
 *   be as the shortcut says. This follows the layout: `z` is the key that types a "z".
 * - Otherwise either the reported character or the physical key can match:
 *   - The reported character ignores `shift`, as symbols need it on some layouts and not on others:
 *     `?` matches whatever types a "?".
 *   - The physical key is matched by its position, which browsers name after what a US keyboard has
 *     there (`event.code`), whatever the layout. `shift` has to be as the shortcut says: `ctrl+c`
 *     works on a cyrillic layout, `alt+a` on macOS where it types "å", `shift+1` where it types
 *     "!".
 * - Names such as `Enter` or `ArrowDown` are compared by name, with `shift` as the shortcut says.
 * - Events during text composition (IME) never match.
 * - Events that only press a modifier are skipped, unless the shortcut is only modifiers:
 *   `ctrl+k ctrl+t` is pressed with ctrl let go in between.
 *
 * ## Example
 *
 * ```ts
 * Shortcut.matches("mod+k", event); // true
 * Shortcut.matches("ctrl+k ctrl+t", [event]); // "partial", after ctrl+k
 * Shortcut.matches("ctrl+k ctrl+t", "ctrl+k"); // "partial": binding "ctrl+k" as well would shadow it
 *
 * let pressed: KeyboardEvent[] = [];
 *
 * window.addEventListener("keydown", (event) => {
 *     pressed.push(event);
 *     for (const binding of [...Shortcut.bindings].reverse()) {
 *         const match = Shortcut.matches(binding.shortcut, pressed);
 *         if (!match) continue;
 *         event.preventDefault();
 *         event.stopPropagation();
 *         if (match === true) {
 *             pressed = [];
 *             binding.run();
 *         }
 *         return;
 *     }
 *     pressed = [];
 * }, { capture: true });
 * ```
 */
export function matches(shortcut: string | Keystroke[], input: string | Keystroke[] | ShortcutEvent | ShortcutEvent[]): boolean | "partial" {
    const keystrokes = keystrokesOf(shortcut)
    const pressed = typeof input === "string" ? keystrokesOf(input) : Array.isArray(input) ? input : [input]

    let matched = 0
    for (const press of pressed) {
        const keystroke = keystrokes[matched]
        if (!keystroke) return false
        if ("code" in press) {
            if (keystroke.key && isModifierPress(press)) continue
            if (!matchesEvent(keystroke, press)) return false
        }
        else if (serializeKeystroke(keystroke) !== serializeKeystroke(press)) {
            return false
        }
        matched++
    }

    if (!matched) return false
    return matched === keystrokes.length || "partial"
}

function keystrokesOf(shortcut: string | Keystroke[]): Keystroke[] {
    return typeof shortcut === "string" ? parse(shortcut) : shortcut.map(normalize)
}
