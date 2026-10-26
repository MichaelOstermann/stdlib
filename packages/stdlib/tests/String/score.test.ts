import { describe, expect, it } from "bun:test"
import { score } from "../../src/String/score"

/**
 * The haystacks in the order they are found in, the best one first, without the ones that are not
 * found.
 */
function rank(needle: string, haystacks: string[]): string[] {
    return haystacks
        .map((haystack) => ({ haystack, score: score(haystack, needle) }))
        .filter((result) => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((result) => result.haystack)
}

describe("String.score", () => {
    it("should be 0 when the characters are not all there in that order", () => {
        expect(score("Settings", "xyz")).toBe(0)
        expect(score("abc", "cba")).toBe(0)
        expect(score("abc", "abcd")).toBe(0)
        expect(score("", "a")).toBe(0)
        expect(score("aab", "abb")).toBe(0)
    })

    it("should be 1 for the same text, in any case", () => {
        expect(score("set", "set")).toBe(1)
        expect(score("Settings", "sEtTiNgS")).toBe(1)
        expect(score("a", "a")).toBe(1)
    })

    it("should find an empty needle in everything", () => {
        expect(score("abc", "")).toBe(1)
        expect(score("", "")).toBe(1)
    })

    it("should stay between 0 and 1 for what is found", () => {
        const haystacks = ["Settings", "Reset password", "openFile", "a_b_c", `${"x".repeat(500)}abc`, `a${" ".repeat(500)}b${" ".repeat(500)}c`, "İstanbul", "日本語 abc", "ABC", "aXbXc"]
        for (const haystack of haystacks) {
            for (const needle of ["abc", "a", "set", "of", "i", "本"]) {
                const result = score(haystack, needle)
                expect(result).toBeGreaterThanOrEqual(0)
                expect(result).toBeLessThanOrEqual(1)
            }
        }
        expect(score(`a${" x".repeat(500)}b`, "ab")).toBeGreaterThan(0)
    })

    it("should prefer characters in a row", () => {
        expect(rank("set", ["s e t", "set up", "sxext"])[0]).toBe("set up")
        expect(rank("face", ["sfxaxcxe", "surface"])[0]).toBe("surface")
        // Unless every one of them starts a word, the way initials do.
        expect(rank("face", ["f a c e", "surface"])[0]).toBe("f a c e")
    })

    it("should prefer the start of words, and the very start most", () => {
        expect(rank("set", ["Reset password", "Settings", "Asset list", "Open settings"])).toEqual(["Settings", "Open settings", "Asset list", "Reset password"])
        expect(rank("face", ["grinning face", "face with tears", "surface"])).toEqual(["face with tears", "grinning face", "surface"])
        expect(rank("of", ["proof", "openFile", "Open File", "offline"])[0]).toBe("offline")
        expect(score("foo bar", "fb")).toBeGreaterThan(score("foobar", "fb"))
        expect(score("fooBar", "fb")).toBeGreaterThan(score("foobar", "fb"))
        expect(score("foo2bar", "f2")).toBeGreaterThan(score("foo2bar", "fo") - 1)
    })

    it("should prefer the shorter one of two that match as well", () => {
        expect(rank("set", ["settings", "set", "setup"])).toEqual(["set", "setup", "settings"])
    })

    it("should find the best way to place the characters, not the first one", () => {
        // The first `a` and `b` are apart, the ones at the end are a word.
        expect(score("a-x-b ab", "ab")).toBeGreaterThan(score("a-x-b xx", "ab"))
        expect(score("xaxb ab", "ab")).toBe(score("xxxx ab", "ab"))
    })

    it("should work with text that changes its length in lowercase, and with text without case", () => {
        expect(score("İstanbul", "ist")).toBeGreaterThan(0.5)
        expect(score("日本語", "本語")).toBeGreaterThan(0)
        expect(score("日本語", "語本")).toBe(0)
    })

    it("should give the same result when called again", () => {
        const first = score("Reset password", "set")
        score("x".repeat(1000), "xxx")
        score("ab", "b")
        expect(score("Reset password", "set")).toBe(first)
    })
})
