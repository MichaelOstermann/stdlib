import Path from "node:path"
import { describe, expect, it } from "bun:test"
import { links } from "../../src/String/links"

/**
 * The lines of a fixture of linkify-it: `%` starts a comment, a line below a link is what is found
 * of it, when that differs.
 */
async function fixture(name: string): Promise<[line: string, expected: string][]> {
    const lines = (await Bun.file(Path.join(import.meta.dirname, "links", name)).text()).split(/\r?\n/).map((line) => line.replace(/^%.*/, ""))
    const cases: [string, string][] = []
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i]!.trim()) continue
        const next = lines[i + 1] ?? ""
        cases.push([lines[i]!, next.trim() ? next : lines[i]!])
        if (next.trim()) i++
    }
    return cases
}

// linkify-it tests these with fuzzyIP, without a scheme an address in numbers only is no link by default.
const addresses = new Set(["4.4.4.4", "192.168.1.1/abc"])

describe("String.links", async () => {
    const found = await fixture("links.txt")
    const notFound = await fixture("not_links.txt")

    it("should find what linkify-it finds", () => {
        for (const [line, expected] of found) {
            if (addresses.has(line)) continue
            expect([...links(line)][0]?.text, line).toBe(expected)
            expect([...links(`\n${line}\n`)][0]?.text, line).toBe(expected)
        }
    })

    it("should not find what linkify-it does not find", () => {
        for (const [line] of notFound) expect([...links(line)], line).toEqual([])
        for (const line of addresses) expect([...links(line)], line).toEqual([])
    })

    it("should tell where a link is, and where it leads", () => {
        expect([...links("See example.com or mail me@example.org")]).toEqual([
            { end: 15, start: 4, text: "example.com", url: "https://example.com" },
            { end: 38, start: 24, text: "me@example.org", url: "mailto:me@example.org" },
        ])
    })

    it("should keep the scheme a link has", () => {
        expect([...links("http://example.com")][0]?.url).toBe("http://example.com")
        expect([...links("FTP://example.com")][0]?.url).toBe("FTP://example.com")
        expect([...links("mailto:me@example.org")][0]?.url).toBe("mailto:me@example.org")
        expect([...links("//example.com")][0]?.url).toBe("//example.com")
    })

    it("should count in code units, the way slice does", () => {
        const text = "👍🏽 see example.com/ü, 日本.com"
        for (const link of links(text)) expect(text.slice(link.start, link.end)).toBe(link.text)
        expect([...links(text)].map((link) => link.text)).toEqual(["example.com/ü", "日本.com"])
    })

    it("should take a label of xn-- that ends in -, which only xn-- allows", () => {
        expect([...links("http://xn--ab-")][0]?.text).toBe("http://xn--ab-")
        expect([...links("http://xn--ab-.com")][0]?.text).toBe("http://xn--ab-.com")
    })

    it("should end a path before dots and an underscore", () => {
        expect([...links("http://a.com/..._b")][0]?.text).toBe("http://a.com/")
        expect([...links("http://a.com/...b")][0]?.text).toBe("http://a.com/...b")
    })

    it("should not backtrack exponentially in the number of labels", () => {
        // linkify-it 5 takes seconds for 24 of them, and doubles with every one more.
        const labels = "xn--a.".repeat(1000)
        expect([...links(`http://${labels}xn--a_`)]).toEqual([])
        expect([...links(`${labels}com_`)]).toEqual([])
        expect([...links(`a@${labels}com_`)]).toEqual([])
    })

    it("should take time linear in the length of the text", () => {
        // GHSA-22p9-wv53-3rq4 and GHSA-v245-v573-v5vm of linkify-it, quadratic: seconds for this much.
        expect([...links("a@b.com\n".repeat(30_000))]).toHaveLength(30_000)
        expect([...links("mailto:".repeat(40_000))]).toEqual([])
    })

    it("should find nothing in nothing", () => {
        expect([...links("")]).toEqual([])
        expect([...links("no links here")]).toEqual([])
    })
})
