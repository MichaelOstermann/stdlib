import { describe, expect, it } from "bun:test"
import { slug } from "../../src/String/slug"

describe("String.slug", () => {
    it("should lowercase, and separate with a single dash", () => {
        expect(slug("Hello World!")).toBe("hello-world")
        expect(slug("  --Hello__World--  ")).toBe("hello-world")
        expect(slug("fooBar 123")).toBe("foobar-123")
        expect(slug("a\tb\nc")).toBe("a-b-c")
    })

    it("should return nothing when there is nothing to keep", () => {
        expect(slug("")).toBe("")
        expect(slug("---")).toBe("")
        expect(slug("日本語")).toBe("")
        expect(slug("👍")).toBe("")
    })

    it("should remove accents", () => {
        expect(slug("Déjà Vu")).toBe("deja-vu")
        expect(slug("Déjà")).toBe("deja")
        expect(slug("İstanbul")).toBe("istanbul")
        expect(slug("Ångström")).toBe("angstroem")
    })

    it("should write other alphabets in Latin", () => {
        expect(slug("Größe")).toBe("groesse")
        expect(slug("GRÖSSE")).toBe("groesse")
        expect(slug("я люблю единорогов")).toBe("ya-lyublyu-edinorogov")
        expect(slug("Я ЛЮБЛЮ")).toBe("ya-lyublyu")
        expect(slug("Ελληνικά")).toBe("ellinika")
        expect(slug("Æther Œuvre")).toBe("aether-oeuvre")
    })

    it("should prefer what belongs together", () => {
        expect(slug("объезд")).toBe("obyezd")
        expect(slug("1️⃣ a")).toBe("1-a")
    })

    it("should spell out &, and close contractions", () => {
        expect(slug("Tom & Jerry")).toBe("tom-and-jerry")
        expect(slug("R&D")).toBe("r-and-d")
        expect(slug("Conway's Law")).toBe("conways-law")
        expect(slug("Don’t")).toBe("dont")
        expect(slug("rock 'n' roll")).toBe("rock-n-roll")
    })

    it("should treat the same character the same with and without something to transliterate", () => {
        expect(slug("a^b")).toBe("a-b")
        expect(slug("a^b é")).toBe("a-b-e")
        expect(slug("a`b é")).toBe("a-b-e")
    })

    it("should never return something that is a path", () => {
        expect(slug("../etc/passwd")).toBe("etc-passwd")
        expect(slug("..")).toBe("")
        expect(slug("a/b\\c")).toBe("a-b-c")
        expect(slug("a\0b")).toBe("a-b")
        expect(slug("%2e%2e%2f")).toBe("2e-2e-2f")
    })

    it("should take what is no valid text", () => {
        expect(slug("a\uD800b")).toBe("a-b")
        expect(slug("\uDC00")).toBe("")
    })

    it("should only return lowercase letters and digits in groups, and return a slug as it is", () => {
        const pieces = ["a", "B", "s", "t", "1", " ", "-", "_", "'", "’", "&", ".", "/", "\\", "^", "\n", "́", "̸", "️", "⃣", "#", "\uD83C", "\uDD70", "é", "İ", "ß", "ẞ", "я", "Ъ", "е", "λ", "日", "👍", "ǅ", "ﬁ", "K"]
        let seed = 1
        const random = (max: number): number => (seed = (seed * 1103515245 + 12345) & 0x7FFFFFFF) % max

        for (let i = 0; i < 20_000; i++) {
            let input = ""
            for (let length = random(12); length > 0; length--) input += pieces[random(pieces.length)]
            const output = slug(input)
            expect(output).toMatch(/^(?:[a-z\d]+(?:-[a-z\d]+)*)?$/)
            expect(slug(output)).toBe(output)
        }
    })

    it("should take a long string in linear time", () => {
        const start = performance.now()
        expect(slug("-'".repeat(200_000))).toBe("")
        expect(slug(`${"a's ".repeat(200_000)}é`)).toHaveLength(600_001)
        expect(performance.now() - start).toBeLessThan(2_000)
    })
})
