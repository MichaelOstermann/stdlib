let segmenter: Intl.Segmenter | undefined

/**
 * # graphemes
 *
 * ```ts
 * function String.graphemes(target: string): Generator<string>
 * ```
 *
 * Returns a generator that yields individual grapheme clusters from `target` string.
 *
 * A grapheme cluster represents a single user-perceived character, which may consist of multiple
 * Unicode code points (e.g., emojis with modifiers, base characters with combining diacriticals).
 *
 * ## Example
 *
 * ```ts
 * [...String.graphemes("hello")]; // ["h", "e", "l", "l", "o"]
 * [...String.graphemes("👨‍👩‍👧‍👦")]; // ["👨‍👩‍👧‍👦"]
 * [...String.graphemes("café")]; // ["c", "a", "f", "é"]
 * [...String.graphemes("👋🏽")]; // ["👋🏽"]
 *
 * // Using in a loop
 * for (const grapheme of String.graphemes("hello👋")) {
 *     console.log(grapheme); // "h", "e", "l", "l", "o", "👋"
 * }
 * ```
 */
export function* graphemes(target: string): Generator<string> {
    // Nothing but ASCII is one character each, except for a line break of two.
    // eslint-disable-next-line no-control-regex
    if (!/[^\x00-\x7F]|\r\n/.test(target)) {
        yield* target
        return
    }

    segmenter ??= new Intl.Segmenter(undefined, {
        granularity: "grapheme",
    })

    const segments = segmenter.segment(target)

    for (const segment of segments) {
        yield segment.segment
    }
}
