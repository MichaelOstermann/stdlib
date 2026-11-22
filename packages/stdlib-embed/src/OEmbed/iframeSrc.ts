import type { OEmbed } from "."

/**
 * # iframeSrc
 *
 * Returns the address of the `<iframe>` in the `html` of a video or rich embed, `undefined` when it
 * has none, or one that is not `http:` or `https:`. Load it in an `<iframe>` of your own instead of
 * rendering `html`: the embed then runs on the provider's origin, not on yours.
 *
 * Embeds that need a script of the provider, like the posts of X, have no `<iframe>`.
 *
 * ## Example
 *
 * ```ts
 * OEmbed.iframeSrc({ type: "video", html: `<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed&amp;t=1"></iframe>` });
 * // "https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed&t=1"
 * OEmbed.iframeSrc({ type: "rich", html: `<blockquote class="twitter-tweet">…</blockquote><script src="…"></script>` });
 * // undefined
 * ```
 */
export function iframeSrc(embed: OEmbed): string | undefined {
    if (embed.type !== "video" && embed.type !== "rich") return undefined

    const match = /<iframe\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(embed.html)
    if (!match) return undefined

    const src = decodeEntities((match[1] ?? match[2] ?? match[3])!.trim())
    if (src.startsWith("//")) return `https:${src}`
    if (/^https?:\/\//i.test(src)) return src
    return undefined
}

function decodeEntities(text: string): string {
    return text
        .replaceAll(/&#x([\da-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
        .replaceAll(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
        .replaceAll("&quot;", '"')
        .replaceAll("&apos;", "'")
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&")
}
