import { transliterations } from "../internals/transliterations"

/**
 * # slug
 *
 * ```ts
 * function String.slug(target: string): string
 * ```
 *
 * Turns `target` into something that can be part of a URL or the name of a file: lowercase letters
 * and digits, in groups separated by a single `-`.
 *
 * Characters that are not Latin are written in Latin where that is known (`ü` as `ue`, `я` as
 * `ya`), accents are removed, everything else separates.
 *
 * The result is empty when nothing of `target` can be written that way, and different strings can
 * result in the same slug.
 *
 * ## Example
 *
 * ```ts
 * String.slug("Hello World!"); // "hello-world"
 * String.slug("  Déjà Vu  "); // "deja-vu"
 * String.slug("Conway's Law"); // "conways-law"
 * String.slug("Tom & Jerry"); // "tom-and-jerry"
 * String.slug("Größe"); // "groesse"
 * String.slug("я люблю единорогов"); // "ya-lyublyu-edinorogov"
 * String.slug("../etc/passwd"); // "etc-passwd"
 * String.slug("日本語"); // ""
 * ```
 */
export function slug(target: string): string {
    let result = target.replaceAll("&", " and ")
    // eslint-disable-next-line no-control-regex
    if (/[^\x00-\x7F]/.test(result)) result = transliterate(result)

    return result
        .toLowerCase()
        // Conway's → conways, instead of conway-s
        .replace(/([a-z\d])['’]([ts])(?![a-z\d])/g, "$1$2")
        .replace(/[^a-z\d]+/g, "-")
        .replace(/^-|-$/g, "")
}

function transliterate(target: string): string {
    const table = transliterations()
    const source = target.normalize().toLowerCase()
    let result = ""

    for (let i = 0; i < source.length;) {
        // ASCII that is not the start of something longer, like the `1` of a keycap emoji.
        if (source.charCodeAt(i) < 0x80 && !(source.charCodeAt(i + 1) >= 0x80)) {
            result += source[i++]
            continue
        }

        // The longest match wins.
        let length = 3
        let replacement: string | undefined
        for (; length > 0; length--) {
            replacement = table.get(source.slice(i, i + length))
            if (replacement !== undefined) break
        }

        result += replacement ?? source[i]
        i += length || 1
    }

    // Strips the remaining diacritics. The ASCII ones, `^` and `` ` ``, are kept: they are separators like in any other input.
    // The final `normalize()` composes again, so a letter that keeps a non-diacritic mark stays distinct from the bare letter.
    // eslint-disable-next-line no-control-regex
    return result.normalize("NFD").replace(/(?![\x00-\x7F])\p{Diacritic}/gu, "").normalize()
}
