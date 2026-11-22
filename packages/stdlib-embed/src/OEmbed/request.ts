import type { OEmbedProvider } from "."

/**
 * # request
 *
 * Returns the address to fetch the embed of `url` from. The answer is JSON. With `maxWidth` and
 * `maxHeight`, the provider answers with an embed that fits, if the provider supports them.
 *
 * ## Example
 *
 * ```ts
 * const provider = OEmbed.provider(url);
 * if (provider) {
 *     const response = await fetch(OEmbed.request(provider, url, { maxWidth: 800 }));
 *     OEmbed.parse(await response.json());
 * }
 * ```
 */
export function request(provider: OEmbedProvider, url: string, options?: { maxHeight?: number, maxWidth?: number }): string {
    const address = new URL(provider.endpoint)
    address.searchParams.set("url", url)
    address.searchParams.set("format", "json")
    if (options?.maxWidth !== undefined) address.searchParams.set("maxwidth", String(options.maxWidth))
    if (options?.maxHeight !== undefined) address.searchParams.set("maxheight", String(options.maxHeight))
    return address.href
}
