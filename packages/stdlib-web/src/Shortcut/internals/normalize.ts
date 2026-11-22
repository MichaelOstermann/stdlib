import type { Keystroke } from ".."
import { modifierOf, nameOf } from "./keys"

/**
 * Returns the single form of a keystroke that all comparisons use:
 * - names as events report them: `esc` → `Escape`
 * - a modifier used as the key becomes a modifier: `Control` → `ctrl`
 * - a single character in lowercase, with uppercase meaning shift: `A` → `shift+a`
 *
 * Anything else stays as written. `ContextMenu` is compared by name. `mdo+k` is a key that never
 * comes.
 */
export function normalize({ alt, ctrl, key, meta, shift }: Keystroke): Keystroke {
    const modifier = modifierOf(key)
    if (modifier) return { alt: alt || modifier === "alt", ctrl: ctrl || modifier === "ctrl", key: "", meta: meta || modifier === "meta", shift: shift || modifier === "shift" }

    const name = nameOf(key)
    if (name) return { alt, ctrl, key: name, meta, shift }

    if (Array.from(key).length !== 1) return { alt, ctrl, key, meta, shift }
    const lower = key.toLowerCase()
    return { alt, ctrl, key: lower, meta, shift: shift || lower !== key }
}

/** Creates a keystroke of only `key`, without modifiers. */
export function keystrokeOf(key: string): Keystroke {
    return { alt: false, ctrl: false, key, meta: false, shift: false }
}
