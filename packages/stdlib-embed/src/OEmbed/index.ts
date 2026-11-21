import { iframeSrc } from "./iframeSrc"
import { parse } from "./parse"
import { provider } from "./provider"
import { providers } from "./providers"
import { request } from "./request"

/**
 * A site that answers oEmbed requests at `endpoint` for the links that match one of its `schemes`.
 */
export type OEmbedProvider = {
    endpoint: string
    name: string
    schemes: string[]
    url: string
}

/**
 * What an oEmbed endpoint answers, by `type`: an image at `url`, or a player or widget in `html`,
 * or only facts about the link.
 */
export type OEmbed =
    | OEmbed.Photo
    | OEmbed.Video
    | OEmbed.Rich
    | OEmbed.Link

export namespace OEmbed {
    export type Base = {
        authorName?: string
        authorUrl?: string
        cacheAge?: number
        providerName?: string
        providerUrl?: string
        thumbnailHeight?: number
        thumbnailUrl?: string
        thumbnailWidth?: number
        title?: string
    }

    export type Photo = Base & { height?: number, type: "photo", url: string, width?: number }
    export type Video = Base & { height?: number, html: string, type: "video", width?: number }
    export type Rich = Base & { height?: number, html: string, type: "rich", width?: number }
    export type Link = Base & { type: "link" }
}

export const OEmbed = {
    iframeSrc,
    parse,
    provider,
    providers,
    request,
}
