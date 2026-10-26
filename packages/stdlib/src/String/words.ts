let segmenter: Intl.Segmenter | undefined

/**
 * # words
 *
 * ```ts
 * function String.words(target: string): Generator<string>
 * ```
 *
 * Returns a generator that yields the words of `target` string, without the whitespace and
 * punctuation in between.
 *
 * What a word is depends on the language, which is left to `Intl.Segmenter`: text without spaces
 * between words is split as well, and an apostrophe or a decimal point does not end a word.
 *
 * ## Example
 *
 * ```ts
 * [...String.words("Hello, world!")]; // ["Hello", "world"]
 * [...String.words("Don't stop at 3.14")]; // ["Don't", "stop", "at", "3.14"]
 * [...String.words("state-of-the-art")]; // ["state", "of", "the", "art"]
 * [...String.words("日本語のテキスト")]; // ["日本語", "の", "テキスト"]
 * [...String.words("👍 ...")]; // []
 * ```
 */
export function* words(target: string): Generator<string> {
    segmenter ??= new Intl.Segmenter(undefined, {
        granularity: "word",
    })

    for (const segment of segmenter.segment(target)) {
        if (segment.isWordLike) yield segment.segment
    }
}
