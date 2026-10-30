import { describe, expect, it } from "bun:test"
import { search } from "../../src/Syntax/search"

const titles = (query: string) => search(query).map((language) => language.title)

describe("search", () => {
    it("gives the popular languages by title without a query", () => {
        const languages = search(" ")
        expect(languages.every((language) => language.popular)).toBe(true)
        expect(languages.map((language) => language.title)).toEqual(languages.map((language) => language.title).sort((a, b) => a.localeCompare(b, "en")))
    })

    it("gives the best matches first", () => {
        expect(titles("typesc").slice(0, 2)).toEqual(["TypeScript", "TSX"])
        expect(titles("typescript react")).toEqual(["TSX"])
        expect(titles("docker")[0]).toBe("Dockerfile")
    })

    it("puts popular languages ahead of others that match about as well", () => {
        expect(titles("py")[0]).toBe("Python")
        expect(titles("rs")[0]).toBe("Rust")
    })

    it("finds languages that are not popular", () => {
        expect(titles("fortran")[0]).toBe("Fortran")
    })

    it("gives nothing when nothing matches", () => {
        expect(search("zzqx")).toEqual([])
    })
})
