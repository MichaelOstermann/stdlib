import { describe, expect, it } from "bun:test"
import { provider } from "../../src/OEmbed/provider"

describe("provider", () => {
    it("finds the provider of a link", () => {
        expect(provider("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.name).toBe("YouTube")
        expect(provider("https://youtu.be/dQw4w9WgXcQ")?.endpoint).toBe("https://www.youtube.com/oembed")
        expect(provider("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT")?.name).toBe("Spotify")
    })

    it("treats http and https the same", () => {
        expect(provider("http://www.youtube.com/watch?v=1")?.name).toBe("YouTube")
        expect(provider("https://www.23hq.com/user/photo/1")?.name).toBe("23HQ")
    })

    it("treats addresses with and without www the same", () => {
        expect(provider("https://www.vimeo.com/1")?.name).toBe("Vimeo")
        expect(provider("https://flickr.com/photos/bees/1/")?.name).toBe("Flickr")
    })

    it("matches the host of a subdomain wildcard with and without subdomains", () => {
        expect(provider("https://youtube.com/watch?v=1")?.name).toBe("YouTube")
        expect(provider("https://m.youtube.com/watch?v=1")?.name).toBe("YouTube")
        expect(provider("https://a.b.tumblr.com/post/1")?.name).toBe("Tumblr")
    })

    it("ignores case", () => {
        expect(provider("HTTPS://WWW.YOUTUBE.COM/watch?v=1")?.name).toBe("YouTube")
    })

    it("matches schemes other than http", () => {
        expect(provider("spotify:track:4cOdK2wGLETKBW3PvgPWqT")?.name).toBe("Spotify")
    })

    it("returns undefined for links without a provider", () => {
        expect(provider("https://example.com")).toBeUndefined()
        expect(provider("https://notyoutube.com/watch?v=1")).toBeUndefined()
        expect(provider("https://evil.com/?https://youtube.com/watch")).toBeUndefined()
        expect(provider("https://evil.com?.tumblr.com/post/1")).toBeUndefined()
        expect(provider("ftp://youtube.com/watch?v=1")).toBeUndefined()
    })
})
