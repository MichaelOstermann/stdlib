import type { Keystroke } from ".."
import { modifierOf, nameOf } from "./keys"

/**
 * The one form of a keystroke that everything compares: names as events report them (`esc` → `Escape`), a modifier as the key becomes the modifier (`{ key: "Control" }` → `{ ctrl: true }`), a single character in lowercase with an uppercase one meaning shift (`A` → `shift+a`), and what is not set left out.
 *
 * Anything else stays as written: `ContextMenu` is compared by name, `mdo+k` is a key that never comes.
 */
export function normalize(keystroke: Keystroke): Keystroke {
    const result: Keystroke = {}
    let key = keystroke.key || undefined
    let shift = !!keystroke.shift

    const modifier = key === undefined ? undefined : modifierOf(key)
    if (modifier === "shift") shift = true
    if (keystroke.alt || modifier === "alt") result.alt = true
    if (keystroke.ctrl || modifier === "ctrl") result.ctrl = true
    if (keystroke.meta || modifier === "meta") result.meta = true
    if (modifier) key = undefined

    if (key !== undefined) {
        const name = nameOf(key)
        if (name) {
            key = name
        }
        else if (Array.from(key).length === 1) {
            const lower = key.toLowerCase()
            if (lower !== key) shift = true
            key = lower
        }
        result.key = key
    }

    if (shift) result.shift = true
    return result
}
