// The recognition of links is taken from linkify-it 5.0.2 with its default options, MIT License, Copyright (c) 2015 Vitaly Puzrin.
// Unicode categories are property escapes instead of uc.micro, which is why every pattern has the u flag.
// Together with the u flag, the i flag folds ſ into s and the Kelvin sign into k, which linkify-it does not.

/** Compiled on the first call, importing costs nothing. */
let compiled: Patterns | undefined

/** Where a link is found, and its scheme: `""` when it has none. */
type Found = [start: number, end: number, schema: string]

/**
 * # links
 *
 * ```ts
 * function String.links(target: string): Generator<{ start: number, end: number, text: string, url: string }>
 * ```
 *
 * Returns a generator that yields the links in `target`: with a scheme, `http:`, `https:`, `ftp:`,
 * `mailto:` or `//`, without one when they end in a known top-level domain, and email addresses.
 * `start` and `end` are where `text` is in `target`, `url` is `text` with `https://` or `mailto:`
 * in front when it has no scheme.
 *
 * What is a link is decided like [linkify-it](https://github.com/markdown-it/linkify-it) does with
 * its default options: an address in numbers only is no link without a scheme, and neither is
 * `localhost`.
 *
 * ## Example
 *
 * ```ts
 * [...String.links("See example.com or mail me@example.org")];
 * // [
 * //     { start: 4, end: 15, text: "example.com", url: "https://example.com" },
 * //     { start: 24, end: 38, text: "me@example.org", url: "mailto:me@example.org" },
 * // ]
 * [...String.links("http://localhost:3000/path?q=1.")]; // [{ start: 0, end: 30, text: "http://localhost:3000/path?q=1", … }]
 * [...String.links("node.js and io.js")]; // []
 * ```
 */
export function* links(target: string): Generator<{ end: number, start: number, text: string, url: string }> {
    const patterns = compiled ??= compile()
    // Each kind is searched for once through the whole text, every search is linear in it. Most texts have none of them,
    // which a quick look for what each one can not do without tells: a scheme, a top-level domain, an @.
    const schemed = target.includes(":") || target.includes("//") ? withSchema(patterns, target) : []
    const fuzzy = patterns.tld.test(target) ? found(patterns.fuzzy, target, "") : []
    const emails = target.includes("@") ? found(patterns.email, target, "mailto:") : []

    let s = 0
    let f = 0
    let e = 0
    let end = 0
    for (;;) {
        // The one that starts first, of two that start at the same place the longer one: with a scheme, an email, a link without one.
        let next = earlier(schemed[s], emails[e])
        next = earlier(next, fuzzy[f])
        if (!next) return
        if (next === schemed[s]) s++
        else if (next === emails[e]) e++
        else f++
        // Within a link found before.
        if (next[0] < end) continue
        const text = target.slice(next[0], next[1])
        yield { end: next[1], start: next[0], text, url: urlOf(text, next[2]) }
        end = next[1]
    }
}

function earlier(a: Found | undefined, b: Found | undefined): Found | undefined {
    if (!a) return b
    if (!b) return a
    if (a[0] !== b[0]) return a[0] < b[0] ? a : b
    return a[1] >= b[1] ? a : b
}

/** The links with a scheme, where the text after the scheme is a link. */
function withSchema(patterns: Patterns, text: string): Found[] {
    const result: Found[] = []
    patterns.schema.lastIndex = 0
    for (let match = patterns.schema.exec(text); match; match = patterns.schema.exec(text)) {
        const schema = match[2]!.toLowerCase()
        const length = lengthAfter(patterns, text, schema, patterns.schema.lastIndex)
        if (length) result.push([match.index + match[1]!.length, match.index + match[0].length + length, schema])
    }
    return result
}

/** What `pattern` finds, without the character in front that it needs to see, its first group. */
function found(pattern: RegExp, text: string, schema: string): Found[] {
    const result: Found[] = []
    pattern.lastIndex = 0
    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
        result.push([match.index + match[1]!.length, match.index + match[0].length, schema])
    }
    return result
}

/** The length of the link after `schema`, which ends at `position`, 0 when there is none. */
function lengthAfter(patterns: Patterns, text: string, schema: string, position: number): number {
    let pattern = patterns.http
    if (schema === "mailto:") pattern = patterns.mailto
    if (schema === "//") {
        // A scheme of its own is in front of it, or a third slash.
        if (position >= 3 && (text[position - 3] === ":" || text[position - 3] === "/")) return 0
        pattern = patterns.protocolRelative
    }
    pattern.lastIndex = position
    return pattern.exec(text)?.[0].length ?? 0
}

function urlOf(text: string, schema: string): string {
    if (schema === "") return `https://${text}`
    if (schema === "mailto:" && !/^mailto:/i.test(text)) return `mailto:${text}`
    return text
}

interface Patterns {
    email: RegExp
    fuzzy: RegExp
    http: RegExp
    mailto: RegExp
    protocolRelative: RegExp
    schema: RegExp
    tld: RegExp
}

function compile(): Patterns {
    const separators = "><｜"
    const ZPCc = String.raw`\p{Z}\p{P}\p{Cc}`
    const ZCc = String.raw`\p{Z}\p{Cc}`
    const letter = `[^${separators}${ZPCc}]`
    const ip4 = String.raw`(?:(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d{1,2})`
    const auth = String.raw`(?:[^${ZCc}@/[\]()]{1,50}@)?`
    const port = String.raw`(?::(?:6(?:[0-4]\d{3}|5(?:[0-4]\d{2}|5(?:[0-2]\d|3[0-5])))|[1-5]?\d{1,4}))?`
    const hostEnd = String.raw`(?=$|[${separators}${ZPCc}])(?!-|_|:\d|\.-|\.(?!$|[${ZPCc}]))`
    const pathParts = [
        String.raw`[^${ZCc}${separators}()[\]{}.,"'?!\-;]`,
        String.raw`\[[^${ZCc}\]]*\]`,
        String.raw`\([^${ZCc})]*\)`,
        String.raw`\{[^${ZCc}}]*\}`,
        String.raw`"[^${ZCc}"]+"`,
        String.raw`'[^${ZCc}']+'`,
        // I'm_king, an apostrophe without a pair.
        String.raw`'(?=${letter}|-)`,
        // The many dots of Google searches and GitHub commit ranges.
        String.raw`\.{2,}[a-z\d%/&]`,
        String.raw`\.(?![${ZCc}.]|$)`,
        "-",
        String.raw`,(?![${ZCc}]|$)`,
        String.raw`;(?![${ZCc}]|$)`,
        String.raw`!+(?![${ZCc}!]|$)`,
        String.raw`\?(?![${ZCc}?]|$)`,
    ].join("|")
    const path = `(?:[/?#](?:${pathParts})+|/)?`
    // A quote can not start a name: an address in quotes is much more common.
    const emailName = String.raw`[\-;:&=+$,.\w][\-;:&=+$,".\w]{0,63}`
    const xn = String.raw`xn--[a-z0-9\-]{1,59}`
    // linkify-it has xn as an alternative of its own here, which matches most labels the other two do as well: a failing match then
    // tries both for every label, exponential in the number of labels. The other two match what ends in a letter, xn only adds what ends in -.
    const domain = String.raw`(?:${letter}|${letter}(?:-|${letter}){0,61}${letter}|xn--[a-z0-9\-]{0,58}-)`
    const host = String.raw`(?:${domain}\.)*${domain}`
    const tldParts = [
        "biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф",
        "a[c-gil-oq-uwxz]|b[abd-jm-or-tvwyz]|c[acdf-ik-oru-z]|d[ejkmoz]|e[cegr-u]|f[i-kmor]|g[abd-il-np-uwy]|h[kmnrtu]|i[del-oq-t]|j[emop]|k[eg-imnprwyz]|l[a-cikr-vy]|m[ac-eghk-z]|n[ace-gilopruz]|om|p[ae-hk-nr-twy]|qa|r[eosuw]|s[a-eg-ort-vx-z]|t[cdf-hj-ortvwz]|u[agksyz]|v[aceginu]|w[fs]|y[et]|z[amw]",
    ].join("|")
    const tlds = `${tldParts}|${xn}`
    const hostFuzzy = String.raw`(?:${domain}\.)+(?:${tlds})`

    return {
        email: new RegExp(`(^|[${separators}"(${ZCc}])(${emailName}@(?:${ip4}|${hostFuzzy})${hostEnd})`, "giu"),
        fuzzy: new RegExp(String.raw`(^|(?![.:/\-_@])[$+<=>^${"`"}|｜${ZPCc}])((?![$+<=>^${"`"}|｜])${hostFuzzy}${port}${hostEnd}${path})`, "giu"),
        http: new RegExp(`//${auth}${host}${port}${hostEnd}${path}`, "iuy"),
        mailto: new RegExp(`${emailName}@${host}${hostEnd}`, "iuy"),
        protocolRelative: new RegExp(String.raw`${auth}(?:localhost|(?:${domain}\.)+(?:${xn}|${letter}{1,63}))${port}${hostEnd}${path}`, "iuy"),
        schema: new RegExp(`(^|(?!_)[${separators}${ZPCc}])(https?:|ftp:|//|mailto:)`, "giu"),
        // What ends a host of a link without a scheme: a top-level domain, and what may follow one.
        tld: new RegExp(String.raw`\.(?:${tlds})(?:[${separators}${ZPCc}]|$)`, "iu"),
    }
}
