import { describe, expect, it } from "bun:test"
import { iframeSrc } from "../../src/OEmbed/iframeSrc"

const rich = (html: string) => iframeSrc({ html, type: "rich" })

describe("iframeSrc", () => {
    it("returns the src of the iframe", () => {
        expect(iframeSrc({ html: `<iframe width="200" height="113" src="https://www.youtube.com/embed/1?feature=oembed" allowfullscreen></iframe>`, type: "video" }))
            .toBe("https://www.youtube.com/embed/1?feature=oembed")
    })

    it("reads quoted and unquoted attributes", () => {
        expect(rich(`<iframe src='https://a.com/1'>`)).toBe("https://a.com/1")
        expect(rich(`<iframe src=https://a.com/1>`)).toBe("https://a.com/1")
        expect(rich(`<IFRAME\nSRC = "https://a.com/1">`)).toBe("https://a.com/1")
    })

    it("decodes entities", () => {
        expect(rich(`<iframe src="https://a.com/?a=1&amp;b=2&#x41;&#65;&quot;">`)).toBe(`https://a.com/?a=1&b=2AA"`)
    })

    it("adds https to protocol-relative addresses", () => {
        expect(rich(`<iframe src="//a.com/1">`)).toBe("https://a.com/1")
    })

    it("skips attributes that end in src", () => {
        expect(rich(`<iframe data-src="https://a.com/wrong" src="https://a.com/1">`)).toBe("https://a.com/1")
    })

    it("returns undefined without an iframe", () => {
        expect(rich(`<blockquote class="twitter-tweet"></blockquote><script src="https://platform.twitter.com/widgets.js"></script>`)).toBeUndefined()
        expect(rich(`<iframe></iframe>`)).toBeUndefined()
    })

    it("returns undefined for addresses that are not http or https", () => {
        expect(rich(`<iframe src="javascript:alert(1)">`)).toBeUndefined()
        expect(rich(`<iframe src="data:text/html,<script></script>">`)).toBeUndefined()
        expect(rich(`<iframe src="/relative">`)).toBeUndefined()
    })

    it("returns undefined for photos and links", () => {
        expect(iframeSrc({ type: "photo", url: "https://a.com/1.jpg" })).toBeUndefined()
        expect(iframeSrc({ type: "link" })).toBeUndefined()
    })
})
