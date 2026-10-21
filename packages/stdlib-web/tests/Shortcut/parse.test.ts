import { afterEach, describe, expect, it } from "bun:test"
import { Shortcut } from "../../src/Shortcut"
import { ks } from "./helpers"

afterEach(() => void Shortcut.mod(null))

describe("Shortcut.parse", () => {
    it("should parse keys, modifiers and sequences", () => {
        expect(Shortcut.parse("a")).toEqual([ks({ key: "a" })])
        expect(Shortcut.parse("ctrl+a")).toEqual([ks({ ctrl: true, key: "a" })])
        expect(Shortcut.parse("meta+shift+k")).toEqual([ks({ key: "k", meta: true, shift: true })])
        expect(Shortcut.parse("alt+ArrowDown")).toEqual([ks({ alt: true, key: "ArrowDown" })])
        expect(Shortcut.parse(" ctrl+k   ctrl+b ")).toEqual([ks({ ctrl: true, key: "k" }), ks({ ctrl: true, key: "b" })])
        expect(Shortcut.parse("ctrl+shift")).toEqual([ks({ ctrl: true, shift: true })])
    })

    it("should resolve aliases and ignore the case of names", () => {
        expect(Shortcut.parse("cmd+esc")).toEqual([ks({ key: "Escape", meta: true })])
        expect(Shortcut.parse("CTRL+ENTER")).toEqual([ks({ ctrl: true, key: "Enter" })])
        expect(Shortcut.parse("option+up")).toEqual([ks({ alt: true, key: "ArrowUp" })])
        expect(Shortcut.parse("space")).toEqual([ks({ key: "Space" })])
        expect(Shortcut.parse("f12")).toEqual([ks({ key: "F12" })])
        expect(Shortcut.parse("ctrl+Control")).toEqual([ks({ ctrl: true })])
    })

    it("should take an uppercase letter for shift", () => {
        expect(Shortcut.parse("K")).toEqual([ks({ key: "k", shift: true })])
        expect(Shortcut.parse("Ö")).toEqual([ks({ key: "ö", shift: true })])
        expect(Shortcut.parse("shift+1")).toEqual([ks({ key: "1", shift: true })])
    })

    it("should parse the plus key", () => {
        expect(Shortcut.parse("+")).toEqual([ks({ key: "+" })])
        expect(Shortcut.parse("ctrl++")).toEqual([ks({ ctrl: true, key: "+" })])
        expect(Shortcut.parse("ctrl+shift++ +")).toEqual([ks({ ctrl: true, key: "+", shift: true }), ks({ key: "+" })])
    })

    it("should keep names that are not listed as written", () => {
        expect(Shortcut.parse("ctrl+ContextMenu")).toEqual([ks({ ctrl: true, key: "ContextMenu" })])
        expect(Shortcut.parse("foo")).toEqual([ks({ key: "foo" })])
        expect(Shortcut.parse("toString")).toEqual([ks({ key: "toString" })])
    })

    it("should not throw, a press with two keys or an empty part is a key of that name", () => {
        expect(Shortcut.parse("mdo+k")).toEqual([ks({ key: "mdo+k" })])
        expect(Shortcut.parse("a+b")).toEqual([ks({ key: "a+b" })])
        expect(Shortcut.parse("ctrl+")).toEqual([ks({ key: "ctrl+" })])
        expect(Shortcut.parse("+k")).toEqual([ks({ key: "+k" })])
        expect(Shortcut.parse("ctrl+k a+b")).toEqual([ks({ ctrl: true, key: "k" }), ks({ key: "a+b" })])
        expect(Shortcut.parse("")).toEqual([])
        expect(Shortcut.parse("   ")).toEqual([])
    })

    it("should resolve mod when parsing", () => {
        Shortcut.mod("meta")
        expect(Shortcut.parse("mod+k")).toEqual([ks({ key: "k", meta: true })])
        Shortcut.mod("ctrl")
        expect(Shortcut.parse("Mod+shift+k")).toEqual([ks({ ctrl: true, key: "k", shift: true })])
    })
})

describe("Shortcut.serialize", () => {
    it("should be the same string for the same keystrokes", () => {
        expect(Shortcut.serialize(Shortcut.parse("shift+ctrl+K cmd+esc"))).toBe("ctrl+shift+k meta+Escape")
        expect(Shortcut.serialize([ks({ key: "A" })])).toBe(Shortcut.serialize([ks({ key: "a", shift: true })]))
        expect(Shortcut.serialize([ks({ key: "Control", shift: true })])).toBe("ctrl+shift")
        expect(Shortcut.serialize([])).toBe("")
    })

    it("should be read back by parse", () => {
        for (const shortcut of ["ctrl++ alt+shift+up", "meta+Escape", "?", "ctrl+ContextMenu", "a+b", "ctrl+", "space g g"]) {
            expect(Shortcut.parse(Shortcut.serialize(Shortcut.parse(shortcut)))).toEqual(Shortcut.parse(shortcut))
        }
    })
})

describe("Shortcut.mod", () => {
    it("should detect the platform", () => {
        const platform = Object.getOwnPropertyDescriptor(navigator, "platform")
        try {
            Object.defineProperty(navigator, "platform", { configurable: true, value: "MacIntel" })
            expect(Shortcut.mod()).toBe("meta")
            Object.defineProperty(navigator, "platform", { configurable: true, value: "iPhone" })
            expect(Shortcut.mod()).toBe("meta")
            Object.defineProperty(navigator, "platform", { configurable: true, value: "Linux x86_64" })
            expect(Shortcut.mod()).toBe("ctrl")
            Object.defineProperty(navigator, "platform", { configurable: true, value: "Win32" })
            expect(Shortcut.mod()).toBe("ctrl")
        }
        finally {
            if (platform) Object.defineProperty(navigator, "platform", platform)
        }
    })

    it("should be overridable", () => {
        expect(Shortcut.mod("meta")).toBe("meta")
        expect(Shortcut.mod()).toBe("meta")
        expect(Shortcut.mod("ctrl")).toBe("ctrl")
        expect(Shortcut.mod()).toBe("ctrl")
    })
})
