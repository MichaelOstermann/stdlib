export type Modifier = "alt" | "ctrl" | "meta" | "shift"

// https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
const named = [
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "Backspace",
    "CapsLock",
    "Clear",
    "Delete",
    "End",
    "Enter",
    "Escape",
    ...Array.from({ length: 24 }, (_, i) => `F${i + 1}`),
    "Home",
    "Insert",
    "NumLock",
    ...Array.from({ length: 10 }, (_, i) => `Numpad${i}`),
    "NumpadAdd",
    "NumpadComma",
    "NumpadDecimal",
    "NumpadDivide",
    "NumpadEnter",
    "NumpadEqual",
    "NumpadMultiply",
    "NumpadSubtract",
    "PageDown",
    "PageUp",
    "ScrollLock",
    "Space",
    "Tab",
]

const modifiers: Record<string, Modifier> = {
    alt: "alt",
    cmd: "meta",
    command: "meta",
    control: "ctrl",
    ctrl: "ctrl",
    meta: "meta",
    opt: "alt",
    option: "alt",
    shift: "shift",
}

// Lowercase, as names are looked up without their case.
const names: Record<string, string> = {
    ...Object.fromEntries(named.map((name) => [name.toLowerCase(), name])),
    " ": "Space",
    "bksp": "Backspace",
    "bs": "Backspace",
    "caps": "CapsLock",
    "cr": "Enter",
    "del": "Delete",
    "down": "ArrowDown",
    "downarrow": "ArrowDown",
    "esc": "Escape",
    "ins": "Insert",
    "left": "ArrowLeft",
    "leftarrow": "ArrowLeft",
    "pgdn": "PageDown",
    "pgup": "PageUp",
    "return": "Enter",
    "right": "ArrowRight",
    "rightarrow": "ArrowRight",
    "spc": "Space",
    "up": "ArrowUp",
    "uparrow": "ArrowUp",
}

/** The modifier a name stands for, as written in a shortcut (`cmd`, `Control`) or reported by an event (`Meta`). */
export function modifierOf(name: string): Modifier | undefined {
    const lower = name.toLowerCase()
    return Object.hasOwn(modifiers, lower) ? modifiers[lower] : undefined
}

/** The name of a key as events report it, for one written in any case or as an alias: `esc` → `Escape`. */
export function nameOf(key: string): string | undefined {
    const lower = key.toLowerCase()
    return Object.hasOwn(names, lower) ? names[lower] : undefined
}
