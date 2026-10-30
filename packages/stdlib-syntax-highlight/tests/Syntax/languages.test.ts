import { describe, expect, it } from "bun:test"
import { plain } from "../../src/Syntax/internals/plain"
import { languages } from "../../src/Syntax/languages"

describe("languages", () => {
    it("gives every name and extension to one language", () => {
        const words = languages.flatMap((language) => [...new Set([...language.names, ...language.extensions])])
        expect(words.filter((word, i) => words.indexOf(word) !== i)).toEqual([])
    })

    it("gives no language a plain word", () => {
        expect(languages.filter((language) => [...language.names, ...language.extensions].some((word) => plain.includes(word)))).toEqual([])
    })

    it("has unique titles", () => {
        const titles = languages.map((language) => language.title)
        expect(titles.filter((title, i) => titles.indexOf(title) !== i)).toEqual([])
    })
})
