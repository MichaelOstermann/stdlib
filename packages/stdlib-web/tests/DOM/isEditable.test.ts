import { describe, expect, it } from "bun:test"
import { isEditable } from "../../src/DOM/isEditable"
import { fakeDOM } from "./helpers"

fakeDOM()

describe("DOM.isEditable", () => {
    it("should be true for fields and what is contenteditable, also inside of it", () => {
        for (const name of ["input", "textarea", "select"]) expect(isEditable(document.createElement(name))).toBe(true)
        const editor = document.createElement("div")
        editor.contentEditable = "true"
        editor.innerHTML = "<p><strong>text</strong></p>"
        document.body.append(editor)
        expect(isEditable(editor)).toBe(true)
        expect(isEditable(editor.querySelector("strong"))).toBe(true)
        editor.remove()
    })

    it("should be false for anything else", () => {
        expect(isEditable(document.createElement("div"))).toBe(false)
        expect(isEditable(document.createElement("button"))).toBe(false)
        expect(isEditable(document)).toBe(false)
        expect(isEditable(window)).toBe(false)
        expect(isEditable(null)).toBe(false)
    })
})
