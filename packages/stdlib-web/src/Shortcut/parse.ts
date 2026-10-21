import type { Keystroke } from "."
import { modifierOf } from "./internals/keys"
import { normalize } from "./internals/normalize"
import { mod } from "./mod"

/**
 * # parse
 *
 * ```ts
 * function Shortcut.parse(shortcut: string): Keystroke[]
 * ```
 *
 * The keystrokes of a shortcut, one per press.
 *
 * - Keys: `a`, `Enter`, `Escape`, `?`, and their aliases, in any case: `esc`, `up`, `space`
 * - Modifiers: `meta` (`cmd`, `command`), `ctrl` (`control`), `alt` (`opt`, `option`), `shift`, and `mod`, which is `meta` on Apple platforms and `ctrl` everywhere else, see `Shortcut.mod`
 * - Keystrokes are joined with `+`, presses with spaces: `ctrl+k ctrl+t`. The `+` key itself is `+` or `ctrl++`
 * - An uppercase letter is that letter with shift: `K` is `shift+k`
 * - Names that are not listed are compared with what the event reports: `ContextMenu`, `MediaPlayPause`
 * - Never throws: a press with two keys or an empty part (`a+b`, `ctrl+`) is a key of that name, which never comes
 *
 * ## Example
 *
 * ```ts
 * Shortcut.parse("ctrl+k ctrl+t");
 * // [{ ctrl: true, key: "k" }, { ctrl: true, key: "t" }]
 *
 * Shortcut.parse("cmd+shift+esc");
 * // [{ meta: true, shift: true, key: "Escape" }]
 *
 * Shortcut.parse("mod+K");
 * // macOS: [{ meta: true, shift: true, key: "k" }]
 * ```
 */
export function parse(shortcut: string): Keystroke[] {
    return shortcut.split(/\s+/).filter(Boolean).map(parseKeystroke)
}

function parseKeystroke(press: string): Keystroke {
    const keystroke: Keystroke = {}
    for (const part of split(press)) {
        const modifier = part.toLowerCase() === "mod" ? mod() : modifierOf(part)
        if (modifier) keystroke[modifier] = true
        else if (!part || keystroke.key !== undefined) return { key: press }
        else keystroke.key = part
    }
    return normalize(keystroke)
}

function split(press: string): string[] {
    if (press === "+") return ["+"]
    if (press.endsWith("++")) return [...press.slice(0, -2).split("+"), "+"]
    return press.split("+")
}
