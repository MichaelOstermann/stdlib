import { describe, expect, it } from "bun:test"
import { parse } from "../../src/OEmbed/parse"

describe("parse", () => {
    it("reads a video", () => {
        expect(parse({ height: 113, html: "<iframe></iframe>", title: "Title", type: "video", version: "1.0", width: 200 })).toEqual({
            height: 113,
            html: "<iframe></iframe>",
            title: "Title",
            type: "video",
            width: 200,
        })
    })

    it("reads a photo", () => {
        expect(parse({ height: 683, type: "photo", url: "https://a.com/b.jpg", width: 1024 })).toMatchObject({
            height: 683,
            type: "photo",
            url: "https://a.com/b.jpg",
            width: 1024,
        })
    })

    it("reads a rich embed and a link", () => {
        expect(parse({ html: "<div></div>", type: "rich" })?.type).toBe("rich")
        expect(parse({ title: "Title", type: "link" })).toMatchObject({ title: "Title", type: "link" })
    })

    it("maps the fields to camel case", () => {
        expect(parse({
            author_name: "Author",
            author_url: "https://a.com/author",
            cache_age: 3600,
            provider_name: "Provider",
            provider_url: "https://a.com",
            thumbnail_height: 90,
            thumbnail_url: "https://a.com/thumbnail.jpg",
            thumbnail_width: 120,
            type: "link",
        })).toMatchObject({
            authorName: "Author",
            authorUrl: "https://a.com/author",
            cacheAge: 3600,
            providerName: "Provider",
            providerUrl: "https://a.com",
            thumbnailHeight: 90,
            thumbnailUrl: "https://a.com/thumbnail.jpg",
            thumbnailWidth: 120,
        })
    })

    it("reads numbers in strings", () => {
        expect(parse({ cache_age: "3600", height: "152", html: "<iframe></iframe>", type: "rich", width: "456.5" })).toMatchObject({
            cacheAge: 3600,
            height: 152,
            width: 456.5,
        })
    })

    it("leaves out fields of the wrong type", () => {
        const embed = parse({ height: null, html: "<blockquote></blockquote>", title: 1, type: "rich", width: "100%" })
        expect(embed).toEqual({ html: "<blockquote></blockquote>", type: "rich" } as never)
        expect(embed).not.toHaveProperty("width", expect.anything())
    })

    it("returns undefined for what is no oEmbed", () => {
        expect(parse(undefined)).toBeUndefined()
        expect(parse(null)).toBeUndefined()
        expect(parse("text")).toBeUndefined()
        expect(parse({})).toBeUndefined()
        expect(parse({ type: "audio" })).toBeUndefined()
        expect(parse({ type: "photo" })).toBeUndefined()
        expect(parse({ type: "video" })).toBeUndefined()
        expect(parse({ html: "", type: "rich" })).toBeUndefined()
    })
})
