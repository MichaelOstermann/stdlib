import { describe, expect, it } from "bun:test"
import { Shortcut } from "../../src/Shortcut"
import { ev } from "./helpers"

const recorded = (...args: Parameters<typeof ev>): string => Shortcut.serialize([Shortcut.fromEvent(ev(...args))])

describe("Shortcut.fromEvent", () => {
    it("should take latin letters and digits as reported, without caps lock", () => {
        expect(recorded("c", "KeyC", "ctrl")).toBe("ctrl+c")
        expect(recorded("A", "KeyA", "shift")).toBe("shift+a")
        expect(recorded("A", "KeyA")).toBe("a")
        expect(recorded("z", "KeyY")).toBe("z")
        expect(recorded("1", "Numpad1")).toBe("1")
    })

    it("should take the physical key with ctrl, alt or meta where they change what is typed", () => {
        expect(recorded("с", "KeyC", "ctrl")).toBe("ctrl+c")
        expect(recorded("å", "KeyA", "alt")).toBe("alt+a")
        expect(recorded("Dead", "KeyN", "alt")).toBe("alt+n")
        expect(recorded("!", "Digit1", "ctrl", "shift")).toBe("ctrl+shift+1")
        expect(recorded("Unidentified", "KeyK")).toBe("k")
    })

    it("should take what is typed otherwise, with shift only for letters that have a case", () => {
        expect(recorded("?", "Slash", "shift")).toBe("?")
        expect(recorded("&", "Digit1")).toBe("&")
        expect(recorded("@", "KeyQ", "ctrl", "alt", "altGraph")).toBe("@")
        expect(recorded("ö", "Semicolon")).toBe("ö")
        expect(recorded("Ö", "Semicolon", "shift")).toBe("shift+ö")
        expect(recorded("с", "KeyC")).toBe("с")
    })

    it("should take names as reported", () => {
        expect(recorded("Enter", "Enter", "shift")).toBe("shift+Enter")
        expect(recorded(" ", "Space")).toBe("Space")
        expect(recorded("ArrowUp", "ArrowUp", "meta")).toBe("meta+ArrowUp")
        expect(recorded("ContextMenu", "ContextMenu")).toBe("ContextMenu")
    })

    it("should take a modifier on its own as the modifiers that are held", () => {
        expect(Shortcut.fromEvent(ev("Control", "ControlLeft", "ctrl"))).toEqual({ ctrl: true })
        expect(Shortcut.fromEvent(ev("Shift", "ShiftLeft", "ctrl", "shift"))).toEqual({ ctrl: true, shift: true })
    })

    it("should record what matches the same event", () => {
        const events = [
            ev("c", "KeyC", "ctrl"),
            ev("A", "KeyA", "shift"),
            ev("A", "KeyA"),
            ev("z", "KeyY"),
            ev("с", "KeyC", "ctrl"),
            ev("с", "KeyC"),
            ev("å", "KeyA", "alt"),
            ev("Dead", "KeyN", "alt"),
            ev("!", "Digit1", "shift"),
            ev("!", "Digit1", "ctrl", "shift"),
            ev("?", "Slash", "shift"),
            ev("?", "Minus", "shift"),
            ev("/", "Digit7", "ctrl", "shift"),
            ev("&", "Digit1"),
            ev("1", "Digit1", "shift"),
            ev("@", "KeyQ", "ctrl", "alt", "altGraph"),
            ev("@", "KeyQ", "altGraph"),
            ev("ö", "Semicolon"),
            ev("Ö", "Semicolon", "shift"),
            ev("Enter", "Enter", "shift"),
            ev(" ", "Space"),
            ev("F5", "F5"),
            ev("1", "Numpad1"),
            ev("End", "Numpad1"),
            ev("Unidentified", "KeyK"),
            ev("", "KeyK"),
            ev("ContextMenu", "ContextMenu"),
            ev("Control", "ControlLeft", "ctrl"),
        ]
        for (const event of events) {
            expect([event.key, Shortcut.matches(Shortcut.serialize([Shortcut.fromEvent(event)]), event)]).toEqual([event.key, true])
        }
    })
})
