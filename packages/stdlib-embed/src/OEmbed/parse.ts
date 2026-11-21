import type { OEmbed } from "."

/**
 * # parse
 *
 * ```ts
 * function OEmbed.parse(json: unknown): OEmbed | undefined
 * ```
 *
 * Reads what an oEmbed endpoint answers. Returns `undefined` when it is no oEmbed: an unknown
 * `type`, a photo without `url`, a video or rich embed without `html`. Fields of the wrong type are
 * left out, a number in a string is read as a number: providers stray from the spec, Spotify
 * answers `"width": "100%"`, X answers `"height": null`.
 *
 * ## Example
 *
 * ```ts
 * OEmbed.parse({ type: "video", html: "<iframe …>", width: 200, height: "113", version: "1.0" });
 * // { type: "video", html: "<iframe …>", width: 200, height: 113 }
 * OEmbed.parse({ type: "video", width: 200, height: 113 });
 * // undefined
 * ```
 */
export function parse(json: unknown): OEmbed | undefined {
    if (!isRecord(json)) return undefined

    const base: OEmbed.Base = {
        authorName: text(json.author_name),
        authorUrl: text(json.author_url),
        cacheAge: number(json.cache_age),
        providerName: text(json.provider_name),
        providerUrl: text(json.provider_url),
        thumbnailHeight: number(json.thumbnail_height),
        thumbnailUrl: text(json.thumbnail_url),
        thumbnailWidth: number(json.thumbnail_width),
        title: text(json.title),
    }

    const url = text(json.url)
    const html = text(json.html)
    const width = number(json.width)
    const height = number(json.height)

    if (json.type === "photo" && url) return { ...base, height, type: "photo", url, width }
    if (json.type === "video" && html) return { ...base, height, html, type: "video", width }
    if (json.type === "rich" && html) return { ...base, height, html, type: "rich", width }
    if (json.type === "link") return { ...base, type: "link" }
    return undefined
}

type Response = {
    author_name?: unknown
    author_url?: unknown
    cache_age?: unknown
    height?: unknown
    html?: unknown
    provider_name?: unknown
    provider_url?: unknown
    thumbnail_height?: unknown
    thumbnail_url?: unknown
    thumbnail_width?: unknown
    title?: unknown
    type?: unknown
    url?: unknown
    width?: unknown
}

function isRecord(value: unknown): value is Response {
    return typeof value === "object" && value !== null
}

function text(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined
    if (value === "") return undefined
    return value
}

function number(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value)) return Number(value)
    return undefined
}
