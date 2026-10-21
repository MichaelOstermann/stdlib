import type { ShortcutEvent } from "../../src/Shortcut"

type Modifiers = "alt" | "altGraph" | "composing" | "ctrl" | "meta" | "shift"

/** A keyboard event as browsers report it: `ev("c", "KeyC", "ctrl")`. */
export function ev(key: string, code: string, ...modifiers: Modifiers[]): ShortcutEvent {
    return {
        altKey: modifiers.includes("alt"),
        code,
        ctrlKey: modifiers.includes("ctrl"),
        isComposing: modifiers.includes("composing"),
        key,
        metaKey: modifiers.includes("meta"),
        shiftKey: modifiers.includes("shift"),
        getModifierState: (name) => name === "AltGraph" && modifiers.includes("altGraph"),
    }
}
