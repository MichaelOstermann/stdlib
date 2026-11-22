import type { OEmbedProvider } from "."
import { providers } from "./providers"

let compiled: { pattern: RegExp, provider: OEmbedProvider }[] | undefined

/**
 * # provider
 *
 * Returns the provider of [oembed.com](https://oembed.com) that embeds `url`, `undefined` when
 * there is none. `http:` and `https:` count as the same, and so do addresses with and without
 * `www.`.
 *
 * ## Example
 *
 * ```ts
 * OEmbed.provider("https://youtu.be/dQw4w9WgXcQ")?.endpoint;
 * // "https://www.youtube.com/oembed"
 * OEmbed.provider("https://example.com");
 * // undefined
 * ```
 */
export function provider(url: string): OEmbedProvider | undefined {
    compiled ??= providers.flatMap((provider) => provider.schemes.map((scheme) => ({ pattern: schemeToPattern(scheme), provider })))
    return compiled.find(({ pattern }) => pattern.test(url))?.provider
}

function schemeToPattern(scheme: string): RegExp {
    if (!/^https?:\/\//i.test(scheme)) return new RegExp(`^${wildcards(scheme)}$`, "i")

    const address = scheme.replace(/^https?:\/\//i, "")
    if (address.startsWith("*.")) return new RegExp(`^https?://(?:[a-z\\d-]+\\.)*${wildcards(address.slice(2))}$`, "i")
    if (address.startsWith("www.")) return new RegExp(`^https?://(?:www\\.)?${wildcards(address.slice(4))}$`, "i")
    return new RegExp(`^https?://(?:www\\.)?${wildcards(address)}$`, "i")
}

function wildcards(scheme: string): string {
    return scheme.split("*").map((part) => RegExp.escape(part)).join(".*")
}
