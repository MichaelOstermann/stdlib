import type { OEmbed } from "."

/**
 * # iframeSrc
 *
 * Returns the `src` of the `<iframe>` in the `html` of a video or rich embed. Returns `undefined`
 * when there is no `<iframe>`, or when the `src` is not `http:` or `https:`. Load the `src` in your
 * own `<iframe>` instead of rendering `html`. The embed then runs on the origin of the provider,
 * not on yours.
 *
 * Embeds that need a script of the provider have no `<iframe>`. Posts on X are one example.
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
