import type { OEmbedProvider } from "../../src/OEmbed"
import { describe, expect, it } from "bun:test"
import { request } from "../../src/OEmbed/request"

const youtube: OEmbedProvider = { endpoint: "https://www.youtube.com/oembed", name: "YouTube", schemes: [], url: "https://www.youtube.com/" }

describe("request", () => {
    it("asks for the embed of a link as JSON", () => {
        expect(request(youtube, "https://youtu.be/dQw4w9WgXcQ")).toBe("https://www.youtube.com/oembed?url=https%3A%2F%2Fyoutu.be%2FdQw4w9WgXcQ&format=json")
    })

    it("asks for a maximum size", () => {
        expect(request(youtube, "https://youtu.be/1", { maxHeight: 600, maxWidth: 800 })).toBe("https://www.youtube.com/oembed?url=https%3A%2F%2Fyoutu.be%2F1&format=json&maxwidth=800&maxheight=600")
    })

    it("keeps the query of the endpoint", () => {
        const hearthis: OEmbedProvider = { ...youtube, endpoint: "https://hearthis.at/oembed/?format=json" }
        expect(request(hearthis, "https://hearthis.at/a/b/")).toBe("https://hearthis.at/oembed/?format=json&url=https%3A%2F%2Fhearthis.at%2Fa%2Fb%2F")
    })
})
