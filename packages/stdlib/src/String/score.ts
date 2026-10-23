const MATCH = 16
const GAP_START = -3
const GAP_EXTENSION = -1
/** For a character at the start of a word. */
const BOUNDARY = 8
/** For the very first character. */
const START = 10
/** For a character where the case changes, or digits start: the `W` of `helloWorld`. */
const CAMEL = 7
/** For a character right after another one that matched. */
const CONSECUTIVE = 4
const NONE = Number.NEGATIVE_INFINITY

// What a character is, to tell where words start.
const OTHER = 0
const LOWER = 1
const UPPER = 2
const DIGIT = 3

// Reused between calls: the scores and the characters in a row of the row before, the same of the current row, and what a match is worth where.
let size = 0
let previousScores = new Float64Array(0)
let previousRuns = new Int32Array(0)
let scores = new Float64Array(0)
let runs = new Int32Array(0)
let bonuses = new Int32Array(0)
// Reused between calls as well: the first and the last place each character of the needle can be found at, with all the others still fitting.
let firsts = new Int32Array(0)
let lasts = new Int32Array(0)

/**
 * # score
 *
 * ```ts
 * function String.score(haystack: string, needle: string): number
 * ```
 *
 * Tells how well `needle` is found in `haystack`, for searching while typing: `0` when its characters are not all there in that order, and up to `1` the better they are.
 *
 * - case is ignored
 * - characters in a row are better than ones that are apart
 * - characters at the start of a word are better than ones in the middle of it: after a space or punctuation, and where `camelCase` changes
 * - the very start is the best place to be found
 * - of two that match as well, the shorter haystack is better
 *
 * The best way to place the characters is found, not the first one. An empty `needle` is found in everything.
 *
 * ## Example
 *
 * ```ts
 * String.score("Settings", "set"); // 0.94
 * String.score("Reset password", "set"); // 0.59
 * String.score("openFile", "of"); // 0.81
 * String.score("Settings", "xyz"); // 0
 *
 * const results = items
 *     .map(item => ({ item, score: String.score(item.title, query) }))
 *     .filter(result => result.score > 0)
 *     .sort((a, b) => b.score - a.score);
 * ```
 *
 */
export function score(haystack: string, needle: string): number {
    if (!needle.length) return 1
    if (needle.length > haystack.length) return 0

    const text = haystack.toLowerCase()
    const query = needle.toLowerCase()
    const n = text.length
    const m = query.length
    // Lowercasing can change how long a string is, where there is no telling which character became which.
    const cased = haystack.length === n ? haystack : text

    if (m > firsts.length) {
        firsts = new Int32Array(m)
        lasts = new Int32Array(m)
    }

    // Most haystacks do not have the characters at all.
    for (let i = 0, from = 0; i < m; i++) {
        const found = text.indexOf(query[i]!, from)
        if (found < 0) return 0
        firsts[i] = found
        from = found + 1
    }

    // A single character is as good as the best place it is found at.
    if (m === 1) {
        let best = NONE
        for (let j = firsts[0]!; j >= 0; j = text.indexOf(query, j + 1)) {
            const before = j === 0 ? OTHER : kindOf(cased, j - 1)
            const match = 0 + MATCH + bonusOf(j, before, kindOf(cased, j)) * 2
            if (match > best) best = match
        }
        return quality(best, m, n)
    }

    lasts[m - 1] = text.lastIndexOf(query[m - 1]!)
    for (let i = m - 2; i >= 0; i--) lasts[i] = text.lastIndexOf(query[i]!, lasts[i + 1]! - 1)

    if (n > size) {
        size = n
        previousScores = new Float64Array(n)
        previousRuns = new Int32Array(n)
        scores = new Float64Array(n)
        runs = new Int32Array(n)
        bonuses = new Int32Array(n)
    }

    // Only what lies between the first place of the first character and the last place of the last one.
    const first = firsts[0]!
    const last = lasts[m - 1]!
    let before = first === 0 ? OTHER : kindOf(cased, first - 1)
    for (let j = first; j <= last; j++) {
        const kind = kindOf(cased, j)
        bonuses[j] = bonusOf(j, before, kind)
        before = kind
    }

    // Locals, which engines keep in registers, where the buffers of the module are looked up again on every access.
    let above = previousScores
    let aboveRuns = previousRuns
    let row = scores
    let rowRuns = runs
    const bonus = bonuses
    let best = NONE

    for (let i = 0; i < m; i++) {
        const character = query.charCodeAt(i)
        // A character is found from its first place to its last one, after that only the row of the next character
        // looks at what is left of this one, up to the last place of the next character.
        const matchesTo = lasts[i]!
        const to = i === m - 1 ? matchesTo : lasts[i + 1]! - 1
        let left = NONE
        let isGap = false
        best = NONE

        for (let j = firsts[i]!; j <= to; j++) {
            // Moving on without matching here.
            const gap = left === NONE ? NONE : left + (isGap ? GAP_EXTENSION : GAP_START)

            let match = NONE
            let run = 0
            if (j <= matchesTo && text.charCodeAt(j) === character) {
                const diagonal = i === 0 ? 0 : j === 0 ? NONE : above[j - 1]!
                if (diagonal !== NONE) {
                    run = (i === 0 || j === 0 ? 0 : aboveRuns[j - 1]!) + 1
                    let worth = bonus[j]!
                    if (run > 1) {
                        const first = bonus[j - run + 1]!
                        // A new word starts in the middle of a run, which counts from here on.
                        if (worth >= BOUNDARY && worth > first) run = 1
                        else worth = Math.max(worth, CONSECUTIVE, first)
                    }
                    // Where the first character is found matters twice as much.
                    match = diagonal + MATCH + (i === 0 ? worth * 2 : worth)
                }
            }

            if (match !== NONE && match >= gap) {
                row[j] = match
                rowRuns[j] = run
                isGap = false
            }
            else {
                row[j] = gap
                rowRuns[j] = 0
                isGap = true
            }

            left = row[j]!
            if (left > best) best = left
        }

        const swapScores = above
        above = row
        row = swapScores
        const swapRuns = aboveRuns
        aboveRuns = rowRuns
        rowRuns = swapRuns
    }

    return quality(best, m, n)
}

function quality(best: number, m: number, n: number): number {
    if (best === NONE) return 0
    // Everything in a row, from the very start.
    const perfect = m * (MATCH + START) + START
    // Found, however far apart, is more than not found.
    return Math.max(best, 1) / perfect * (0.9 + 0.1 * m / n)
}

function bonusOf(j: number, before: number, kind: number): number {
    if (j === 0) return START
    if (kind === OTHER || before === OTHER) return BOUNDARY
    if (before === LOWER && kind === UPPER) return CAMEL
    if (before !== DIGIT && kind === DIGIT) return CAMEL
    return 0
}

function kindOf(text: string, index: number): number {
    const code = text.charCodeAt(index)
    if (code >= 97 && code <= 122) return LOWER
    if (code >= 65 && code <= 90) return UPPER
    if (code >= 48 && code <= 57) return DIGIT
    if (code < 128) return OTHER
    const character = text[index]!
    // Letters without case are part of a word as well.
    if (character !== character.toLowerCase()) return UPPER
    return /[\p{L}\p{N}]/u.test(character) ? LOWER : OTHER
}
