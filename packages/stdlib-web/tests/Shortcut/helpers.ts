import type { Keystroke, ShortcutEvent } from "../../src/Shortcut"
import { onTestFinished } from "bun:test"

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

/** Pretends to run on `name`, as `navigator.platform` reports it, until the end of the test. */
export function platform(name: string): void {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "platform")
    Object.defineProperty(navigator, "platform", { configurable: true, value: name })
    onTestFinished(() => {
        if (descriptor) Object.defineProperty(navigator, "platform", descriptor)
        else Reflect.deleteProperty(navigator, "platform")
    })
}

/** A keystroke with what is not given as `false` and `""`: `ks({ ctrl: true, key: "k" })`. */
export function ks(fields: Partial<Keystroke>): Keystroke {
    return { alt: false, ctrl: false, key: "", meta: false, shift: false, ...fields }
}
