import type { ShortcutEvent } from "../../src/Shortcut"
import { describe, expect, it } from "bun:test"
import { Shortcut } from "../../src/Shortcut"
import { ev, ks, platform } from "./helpers"

const is = (shortcut: string, event: ShortcutEvent): boolean | "partial" => Shortcut.matches(shortcut, event)

describe("Shortcut.matches", () => {
    it("should match letters and digits as they are reported", () => {
        expect(is("c", ev("c", "KeyC"))).toBe(true)
        expect(is("ctrl+c", ev("c", "KeyC", "ctrl"))).toBe(true)
        expect(is("1", ev("1", "Digit1"))).toBe(true)
        expect(is("c", ev("d", "KeyD"))).toBe(false)
    })

    it("should require ctrl, alt and meta to be exactly as given", () => {
        expect(is("c", ev("c", "KeyC", "ctrl"))).toBe(false)
        expect(is("c", ev("c", "KeyC", "meta"))).toBe(false)
        expect(is("c", ev("c", "KeyC", "alt"))).toBe(false)
        expect(is("ctrl+c", ev("c", "KeyC"))).toBe(false)
        expect(is("ctrl+c", ev("c", "KeyC", "ctrl", "meta"))).toBe(false)
        expect(is("meta+alt+c", ev("c", "KeyC", "alt", "meta"))).toBe(true)
    })

    it("should treat shift as a modifier for letters and digits", () => {
        expect(is("shift+a", ev("A", "KeyA", "shift"))).toBe(true)
        expect(is("A", ev("A", "KeyA", "shift"))).toBe(true)
        expect(is("a", ev("A", "KeyA", "shift"))).toBe(false)
        expect(is("shift+a", ev("a", "KeyA"))).toBe(false)
    })

    it("should not take caps lock for shift", () => {
        expect(is("a", ev("A", "KeyA"))).toBe(true)
        expect(is("shift+a", ev("A", "KeyA"))).toBe(false)
        // Caps lock with shift types a lowercase letter.
        expect(is("shift+a", ev("a", "KeyA", "shift"))).toBe(true)
    })

    it("should follow the layout for latin letters", () => {
        // German: the key right of T types a "z".
        expect(is("z", ev("z", "KeyY"))).toBe(true)
        expect(is("y", ev("z", "KeyY"))).toBe(false)
    })

    it("should use the physical key on layouts without latin letters", () => {
        // Russian: ctrl+с
        expect(is("ctrl+c", ev("с", "KeyC", "ctrl"))).toBe(true)
        expect(is("ctrl+c", ev("с", "KeyC"))).toBe(false)
        expect(is("ctrl+v", ev("с", "KeyC", "ctrl"))).toBe(false)
    })

    it("should match alt with a letter where that types another character", () => {
        // macOS: option+a types "å", option+n is a dead key.
        expect(is("alt+a", ev("å", "KeyA", "alt"))).toBe(true)
        expect(is("alt+n", ev("Dead", "KeyN", "alt"))).toBe(true)
        expect(is("a", ev("å", "KeyA", "alt"))).toBe(false)
        expect(is("å", ev("å", "KeyA", "alt"))).toBe(false)
    })

    it("should match shift with a digit where that types a symbol", () => {
        expect(is("shift+1", ev("!", "Digit1", "shift"))).toBe(true)
        expect(is("1", ev("!", "Digit1", "shift"))).toBe(false)
        expect(is("ctrl+shift+1", ev("!", "Digit1", "ctrl", "shift"))).toBe(true)
    })

    it("should match symbols by what is typed, whether that needs shift or not", () => {
        // US: shift+/ types "?", German: shift+ß does.
        expect(is("?", ev("?", "Slash", "shift"))).toBe(true)
        expect(is("?", ev("?", "Minus", "shift"))).toBe(true)
        expect(is("!", ev("!", "Digit1", "shift"))).toBe(true)
        expect(is("/", ev("/", "Slash"))).toBe(true)
        // German: shift+7 types "/".
        expect(is("ctrl+/", ev("/", "Digit7", "ctrl", "shift"))).toBe(true)
        expect(is("shift+/", ev("?", "Slash", "shift"))).toBe(true)
        expect(is("?", ev("/", "Slash"))).toBe(false)
    })

    it("should match digits on layouts that need shift for them", () => {
        // French: the 1 key types "&", with shift "1".
        expect(is("1", ev("&", "Digit1"))).toBe(true)
        expect(is("&", ev("&", "Digit1"))).toBe(true)
        expect(is("shift+1", ev("1", "Digit1", "shift"))).toBe(true)
        expect(is("1", ev("1", "Digit1", "shift"))).toBe(false)
    })

    it("should match characters typed with AltGr", () => {
        // German: AltGr+q types "@", Windows reports ctrl+alt with it.
        expect(is("@", ev("@", "KeyQ", "ctrl", "alt", "altGraph"))).toBe(true)
        expect(is("@", ev("@", "KeyQ", "altGraph"))).toBe(true)
        expect(is("ctrl+@", ev("@", "KeyQ", "ctrl", "alt", "altGraph"))).toBe(false)
        expect(is("ctrl+alt+q", ev("@", "KeyQ", "ctrl", "alt", "altGraph"))).toBe(true)
        expect(is("@", ev("@", "Digit2", "ctrl", "alt"))).toBe(false)
    })

    it("should treat shift as a modifier for letters outside of the latin alphabet", () => {
        expect(is("ö", ev("ö", "Semicolon"))).toBe(true)
        expect(is("shift+ö", ev("Ö", "Semicolon", "shift"))).toBe(true)
        expect(is("ö", ev("Ö", "Semicolon", "shift"))).toBe(false)
        expect(is(";", ev("ö", "Semicolon"))).toBe(true)
    })

    it("should match named keys by name", () => {
        expect(is("enter", ev("Enter", "Enter"))).toBe(true)
        expect(is("shift+enter", ev("Enter", "Enter", "shift"))).toBe(true)
        expect(is("enter", ev("Enter", "Enter", "shift"))).toBe(false)
        expect(is("space", ev(" ", "Space"))).toBe(true)
        expect(is("esc", ev("Escape", "Escape"))).toBe(true)
        expect(is("up", ev("ArrowUp", "ArrowUp"))).toBe(true)
        expect(is("f5", ev("F5", "F5"))).toBe(true)
        expect(is("enter", ev("Escape", "Escape"))).toBe(false)
    })

    it("should match the numpad by its digits or by name", () => {
        expect(is("1", ev("1", "Numpad1"))).toBe(true)
        expect(is("numpad1", ev("1", "Numpad1"))).toBe(true)
        expect(is("numpad1", ev("End", "Numpad1"))).toBe(true)
        expect(is("numpad1", ev("1", "Digit1"))).toBe(false)
    })

    it("should fall back to the physical key when the key is not reported", () => {
        expect(is("k", ev("Unidentified", "KeyK"))).toBe(true)
        expect(is("k", ev("", "KeyK"))).toBe(true)
    })

    it("should ignore events during text composition", () => {
        expect(is("a", ev("a", "KeyA", "composing"))).toBe(false)
        expect(is("a", ev("Process", "KeyA"))).toBe(false)
    })

    it("should match hotkeys that only consist of modifiers", () => {
        expect(is("ctrl", ev("Control", "ControlLeft", "ctrl"))).toBe(true)
        expect(is("ctrl+shift", ev("Shift", "ShiftLeft", "ctrl", "shift"))).toBe(true)
        expect(is("ctrl", ev("c", "KeyC", "ctrl"))).toBe(false)
        expect(is("c", ev("Control", "ControlLeft", "ctrl"))).toBe(false)
    })
})

describe("Shortcut.matches, names that are not listed", () => {
    it("should compare them with what the event reports, in any case", () => {
        expect(is("ContextMenu", ev("ContextMenu", "ContextMenu"))).toBe(true)
        expect(is("mediaplaypause", ev("MediaPlayPause", ""))).toBe(true)
        expect(is("ctrl+PrintScreen", ev("PrintScreen", "PrintScreen", "ctrl"))).toBe(true)
        expect(is("PrintScreen", ev("PrintScreen", "PrintScreen", "ctrl"))).toBe(false)
    })

    it("should never match what cannot be a key", () => {
        for (const shortcut of ["mdo+k", "a+b", "ctrl+", "+k", "ctrl+a+b", "", "   "]) {
            expect(is(shortcut, ev("k", "KeyK"))).toBe(false)
            expect(is(shortcut, ev("k", "KeyK", "ctrl"))).toBe(false)
            expect(is(shortcut, ev("a", "KeyA"))).toBe(false)
            expect(is(shortcut, ev("Control", "ControlLeft", "ctrl"))).toBe(false)
        }
    })
})

describe("Shortcut.matches, sequences", () => {
    const k = ev("k", "KeyK", "ctrl")
    const t = ev("t", "KeyT", "ctrl")
    const control = ev("Control", "ControlLeft", "ctrl")

    it("should match event by event, partially until all are there", () => {
        expect(Shortcut.matches("ctrl+k ctrl+t", [k])).toBe("partial")
        expect(Shortcut.matches("ctrl+k ctrl+t", [k, t])).toBe(true)
        expect(Shortcut.matches("ctrl+k ctrl+t", [t])).toBe(false)
        expect(Shortcut.matches("ctrl+k ctrl+t", [k, k])).toBe(false)
        expect(Shortcut.matches("ctrl+k ctrl+t", [k, t, t])).toBe(false)
        expect(Shortcut.matches("ctrl+k", [k, t])).toBe(false)
        expect(Shortcut.matches("ctrl+k ctrl+t", [])).toBe(false)
        expect(Shortcut.matches("g g", [ev("g", "KeyG"), ev("g", "KeyG")])).toBe(true)
    })

    it("should skip presses of only a modifier", () => {
        expect(Shortcut.matches("ctrl+k ctrl+t", [control, k, control, t])).toBe(true)
        expect(Shortcut.matches("ctrl+k ctrl+t", [control, k, control])).toBe("partial")
        expect(Shortcut.matches("ctrl+k ctrl+t", [control])).toBe(false)
        expect(Shortcut.matches("?", [ev("Shift", "ShiftLeft", "shift"), ev("?", "Slash", "shift")])).toBe(true)
        expect(Shortcut.matches("@", [ev("AltGraph", "AltRight"), ev("@", "KeyQ", "altGraph")])).toBe(true)
    })

    it("should not skip them for shortcuts of only modifiers", () => {
        expect(Shortcut.matches("ctrl", [control])).toBe(true)
        expect(Shortcut.matches("ctrl ctrl", [control, control])).toBe(true)
        expect(Shortcut.matches("ctrl ctrl", [control])).toBe("partial")
    })
})

describe("Shortcut.matches, shortcuts and keystrokes", () => {
    it("should compare them as parsed", () => {
        expect(Shortcut.matches("ctrl+shift+k", "shift+ctrl+K")).toBe(true)
        expect(Shortcut.matches("cmd+esc", "meta+Escape")).toBe(true)
        expect(Shortcut.matches("ctrl+k ctrl+t", "ctrl+k")).toBe("partial")
        expect(Shortcut.matches("ctrl+k", "ctrl+k ctrl+t")).toBe(false)
        expect(Shortcut.matches("ctrl+k", "ctrl+j")).toBe(false)
        expect(Shortcut.matches("ctrl+k", "")).toBe(false)
        expect(Shortcut.matches("", "")).toBe(false)
    })

    it("should take keystrokes on both sides", () => {
        expect(Shortcut.matches([ks({ ctrl: true, key: "K" })], "ctrl+shift+k")).toBe(true)
        expect(Shortcut.matches("ctrl+k ctrl+t", [ks({ ctrl: true, key: "k" })])).toBe("partial")
        expect(Shortcut.matches("esc", [ks({ key: "esc" })])).toBe(true)
    })

    it("should take mod for the modifier of the platform", () => {
        platform("MacIntel")
        expect(Shortcut.matches("mod+k", ev("k", "KeyK", "meta"))).toBe(true)
        platform("Linux x86_64")
        expect(Shortcut.matches("mod+k", ev("k", "KeyK", "meta"))).toBe(false)
        expect(Shortcut.matches("mod+k", ev("k", "KeyK", "ctrl"))).toBe(true)
    })
})
