import { bindings } from "./bindings"
import { fromEvent } from "./fromEvent"
import { matches } from "./matches"
import { parse } from "./parse"
import { serialize } from "./serialize"

/** One press of a shortcut: a key, and the modifiers held with it. What `Shortcut.parse` returns, eg. to render `<kbd>` from. */
export interface Keystroke {
    alt: boolean
    ctrl: boolean
    key: string
    meta: boolean
    shift: boolean
}

/** A shortcut and what it runs. Apps add what they need by declaring it again, see `Shortcut.bindings`. */
export interface ShortcutBinding {
    shortcut: string
    run: () => void
}

/** What is needed from a `KeyboardEvent`. */
export interface ShortcutEvent {
    altKey: boolean
    code: string
    ctrlKey: boolean
    isComposing?: boolean
    key: string
    metaKey: boolean
    shiftKey: boolean
    getModifierState?: (key: string) => boolean
}

export const Shortcut = {
    bindings,
    fromEvent,
    matches,
    parse,
    serialize,
}
