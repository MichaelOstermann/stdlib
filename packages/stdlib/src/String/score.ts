// Taken from fuzzysort@4.0.2, what fuzzysort.single scores with, MIT License, Copyright (c) 2018 Stephen Kamenar

interface Query {
    codes: number[]
    hasSpace: boolean
    lower: string
    parts: Query[]
}

// Characters that are searched for as the ones they look like.
const remappings: Record<string, string> = {}
const remapFrom = '\\"`‘’‚‛“”„‟«»‹›‐–—−⁄∕…øØłŁđĐðÐıħĦŧŦ'
const remapTo = "/''''''''''''''----//.oOlLdDdDihHtT"
for (let i = 0; i < remapFrom.length; i++) remappings[remapFrom[i]!] = remapTo[i]!

// What `scan` tells about a haystack.
const MISSING = 0
const FOUND = 1
const OTHER = 2

// The needle of the call before: lists are searched with the same one over and over.
let lastNeedle = ""
let lastQuery: Query | undefined

// Reused between calls: the start of the next word after each place, the starts of the words, and the places the
// characters of the needle are found at.
let size = 0
let next = new Int32Array(0)
let beginnings = new Int32Array(0)
let simpleMatch = new Int32Array(0)
let strictMatch = new Int32Array(0)
let indexes = new Int32Array(0)
// Where the start of the next word was moved to while several words of a needle are searched, to undo it.
let changes = new Int32Array(0)

// What the haystack of the current call is.
let target = ""
let remapped = ""
let beginningsReady = false
let targetLower = ""
let targetLen = 0
let beginningsLen = 0
let indexesLen = 0

/**
 * # score
 *
 * ```ts
 * function String.score(haystack: string, needle: string): number
 * ```
 *
 * Tells how well `needle` is found in `haystack`, for searching while typing: `0` when its
 * characters are not all there in that order, and up to `1` the better they are. Case is ignored,
 * and an empty `needle` is found in everything.
 *
 * ## Example
 *
 * ```ts
 * String.score("Settings", "set"); // 0.89
 * String.score("Reset password", "set"); // 0.66
 * String.score("Settings", "xyz"); // 0
 *
 * const results = items
 *     .map(item => ({ item, score: String.score(item.title, query) }))
 *     .filter(result => result.score > 0.4)
 *     .sort((a, b) => b.score - a.score);
 * ```
 */
export function score(haystack: string, needle: string): number {
    if (!needle.trim()) return 1
    if (!haystack) return 0
    if (needle !== lastNeedle || !lastQuery) {
        lastNeedle = needle
        lastQuery = prepareQuery(needle)
    }
    const query = lastQuery
    // Most haystacks do not have the characters in that order, which fuzzysort finds out with flags of the characters
    // they have, kept from call to call.
    if (!query.hasSpace && query.codes.length === 1) {
        const result = scoreCharacter(haystack, query.codes[0]!)
        if (result >= 0) return result
    }
    const plain = scan(haystack, query)
    if (plain === MISSING) return 0
    if (plain === FOUND) {
        prepareTarget(haystack, haystack, haystack.toLowerCase())
    }
    else {
        const remapped = remapChars(haystack)
        prepareTarget(haystack, remapped, remapped.toLowerCase())
        if (!isFound(targetLower, query)) return 0
    }
    const result = !query.hasSpace && query.codes.length === 2 ? algorithm2(query) : algorithm(query, false, false, true)
    return result === undefined ? 0 : normalizeScore(result)
}

/**
 * Whether the characters of every word of `query` are in `haystack` in that order, which a match
 * needs, in one pass that lowercases as it goes: `OTHER` when `haystack` has characters that need
 * more than ASCII to lowercase, or that look like others.
 */
function scan(haystack: string, query: Query): number {
    if (query.hasSpace) {
        for (const part of query.parts) {
            const result = scan(haystack, part)
            if (result !== FOUND) return result
        }
        return FOUND
    }
    const queryCodes = query.codes
    // Only `İ` is longer in lowercase.
    if (queryCodes.length > haystack.length) return haystack.includes("\u0130") ? OTHER : MISSING
    let j = 0
    let wanted = queryCodes[0]
    for (let i = 0; i < haystack.length; i++) {
        let code = haystack.charCodeAt(i)
        if (code > 127 || code === 92 || code === 34 || code === 96) return OTHER
        if (code >= 65 && code <= 90) code += 32
        if (code === wanted) wanted = queryCodes[++j]
    }
    return j === queryCodes.length ? FOUND : MISSING
}

/**
 * What `algorithm` scores a single character with, in one pass that finds the first start of a word
 * with the character, without preparing every start of a word: `-1` when `haystack` has characters
 * that `scan` would not find plain.
 */
function scoreCharacter(haystack: string, code: number): number {
    let first = -1
    let atBeginning = -1
    let count = 0
    let wasUpper = false
    let wasAlnum = false
    for (let i = 0; i < haystack.length; i++) {
        const raw = haystack.charCodeAt(i)
        if (raw > 127 || raw === 92 || raw === 34 || raw === 96) return -1
        const upper = raw >= 65 && raw <= 90
        const alnum = upper || (raw >= 97 && raw <= 122) || (raw >= 48 && raw <= 57)
        const beginning = (upper && !wasUpper) || !wasAlnum || !alnum
        wasUpper = upper
        wasAlnum = alnum
        const lower = upper ? raw + 32 : raw
        if (beginning) {
            count++
            if (atBeginning < 0 && lower === code) atBeginning = i
        }
        if (first < 0 && lower === code) first = i
    }

    if (first < 0) return 0
    const matchI = atBeginning < 0 ? first : atBeginning
    let result = matchI === 0 ? 0 : -matchI * matchI * 0.2
    if (atBeginning < 0) result *= 1000
    else if (count > 24) result *= (count - 24) * 10
    return normalizeScore(result - (haystack.length - 1))
}

/** Like `scan`, for a haystack that is lowercase and mapped already. */
function isFound(lower: string, query: Query): boolean {
    if (query.hasSpace) {
        for (const part of query.parts) if (!isFound(lower, part)) return false
        return true
    }
    if (query.lower.length > lower.length) return false
    for (let i = 0, from = 0; i < query.lower.length; i++) {
        from = lower.indexOf(query.lower[i]!, from) + 1
        if (!from) return false
    }
    return true
}

function needsRemap(value: string): boolean {
    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i)
        if (code > 127 || code === 92 || code === 34 || code === 96) return true
    }
    return false
}

function prepareQuery(search: string): Query {
    const lower = remapChars(search).trim().toLowerCase()
    const query = lowerInfo(lower)
    query.parts = query.hasSpace ? [...new Set(lower.split(/\s+/))].map(prepareQuery) : []
    return query
}

function lowerInfo(lower: string): Query {
    const queryCodes: number[] = []
    for (let i = 0; i < lower.length; i++) queryCodes[i] = lower.charCodeAt(i)
    return { codes: queryCodes, hasSpace: lower.includes(" "), lower, parts: [] }
}

function prepareTarget(haystack: string, haystackRemapped: string, lower: string): void {
    target = haystack
    remapped = haystackRemapped
    targetLower = lower
    targetLen = targetLower.length
    beginningsReady = false

    if (Math.max(targetLen, target.length) + 1 > size) {
        size = Math.max(targetLen, target.length) + 1
        next = new Int32Array(size)
        beginnings = new Int32Array(size)
        changes = new Int32Array(size * 2)
    }
}

/**
 * Where words start, only once the characters of the needle are found: most haystacks do not have
 * them.
 */
function prepareBeginnings(): void {
    if (beginningsReady) return
    beginningsReady = true

    // A word starts at an uppercase letter after one that is not, and at anything after or that is not a letter or a
    // digit.
    let wasUpper = false
    let wasAlnum = false
    let fill = 0
    beginningsLen = 0
    for (let i = 0; i < remapped.length; i++) {
        const code = remapped.charCodeAt(i)
        const upper = code >= 65 && code <= 90
        const alnum = upper || (code >= 97 && code <= 122) || (code >= 48 && code <= 57)
        const beginning = (upper && !wasUpper) || !wasAlnum || !alnum
        wasUpper = upper
        wasAlnum = alnum
        if (!beginning) continue
        beginnings[beginningsLen++] = i
        for (; fill < i; fill++) next[fill] = i
    }
    for (; fill < target.length; fill++) next[fill] = target.length
    // Lowercase can be longer, where fuzzysort reads past the end of its array.
    for (; fill < targetLen; fill++) next[fill] = targetLen
}

function remapCharacter(char: string): string {
    const remapped = remappings[char]
    if (remapped !== undefined) return remapped
    if (char.charCodeAt(0) < 128) return char
    const stripped = char.normalize("NFKD").replace(/[\u{300}-\u{36F}]/gu, "")
    return stripped.length === 1 ? stripped : char
}

function remapChars(value: string): string {
    return needsRemap(value) ? value.replace(/[^\0-\x7F]|[\\"`]/g, remapCharacter) : value
}

function ensureMatches(length: number): void {
    if (length <= simpleMatch.length) return
    simpleMatch = new Int32Array(length)
    strictMatch = new Int32Array(length)
    indexes = new Int32Array(length)
}

function algorithm2(search: Query): number | undefined {
    const firstCode = search.codes[0]!
    const secondCode = search.codes[1]!

    let first = 0
    while (targetLower.charCodeAt(first) !== firstCode) if (++first >= targetLen) return undefined
    let second = first + 1
    while (targetLower.charCodeAt(second) !== secondCode) if (++second >= targetLen) return undefined

    prepareBeginnings()
    const end = beginningsLen

    let substringI = targetLower.indexOf(search.lower, first)
    const substring = substringI !== -1
    let low = lowerBound(0, end, substringI)
    let substringStart = substring && low < end && beginnings[low] === substringI
    let strict = substringStart && substringI === first

    if (!strict) {
        let firstBeginning = 0
        while (firstBeginning < end && beginnings[firstBeginning]! < first) firstBeginning++

        for (let backtracks = 0; firstBeginning < end;) {
            const strictFirst = beginnings[firstBeginning]!
            if (targetLower.charCodeAt(strictFirst) !== firstCode) {
                firstBeginning++
                continue
            }

            const consecutive = strictFirst + 1
            if (consecutive < targetLen && targetLower.charCodeAt(consecutive) === secondCode) {
                first = strictFirst
                second = consecutive
                strict = true
                break
            }

            let secondBeginning = firstBeginning + 1
            while (secondBeginning < end && beginnings[secondBeginning]! <= consecutive) secondBeginning++
            while (secondBeginning < end && targetLower.charCodeAt(beginnings[secondBeginning]!) !== secondCode) secondBeginning++
            if (secondBeginning < end) {
                first = strictFirst
                second = beginnings[secondBeginning]!
                strict = true
                break
            }

            if (++backtracks > 200) break
            firstBeginning++
        }
    }

    if (substring && !substringStart) {
        while (low < end && beginnings[low]! <= substringI) low++
        for (; low < end; low++) {
            const index = beginnings[low]!
            if (targetLower.charCodeAt(index) === firstCode && index + 1 < targetLen && targetLower.charCodeAt(index + 1) === secondCode) {
                substringI = index
                substringStart = true
                break
            }
        }
    }

    if (substring && (!strict || substringStart)) {
        first = substringI
        second = substringI + 1
    }

    let resultScore = second - first === 1 ? 0 : first - second * 2 - 11
    if (first) resultScore -= first * first * 0.2
    if (!strict) resultScore *= 1000
    else if (end > 24) resultScore *= (end - 24) * 10

    const lengthPenalty = (targetLen - 2) / 2
    resultScore -= lengthPenalty
    if (substring) resultScore /= 5
    if (substringStart) resultScore /= 5
    resultScore -= lengthPenalty
    const substringEnd = substring && second === first + 1 && (second + 1 === targetLen || isBeginning(second + 1))
    ensureMatches(2)
    indexes[0] = first
    indexes[1] = second
    indexesLen = 2
    return substringEnd ? resultScore + Math.min(4, -resultScore / 2) : resultScore
}

function algorithm(search: Query, spaces: boolean, changed: boolean, singleMatch: boolean): number | undefined {
    if (!spaces && search.hasSpace) return algorithmSpaces(search)

    const searchCodes = search.codes
    const searchLen = searchCodes.length
    ensureMatches(searchLen)
    let searchCode = searchCodes[0]
    let searchI = 0
    let targetI = 0
    for (;;) {
        if (searchCode === targetLower.charCodeAt(targetI)) {
            simpleMatch[searchI] = targetI
            if (++searchI === searchLen) break
            searchCode = searchCodes[searchI]
        }
        if (++targetI >= targetLen) return undefined
    }
    prepareBeginnings()

    if (searchLen === 1 && !changed && singleMatch) {
        targetI = simpleMatch[0] === 0 ? 0 : next[simpleMatch[0]! - 1]!
        while (targetI < targetLen && searchCode !== targetLower.charCodeAt(targetI)) targetI = next[targetI]!
        const strict = targetI < targetLen
        const matchI = strict ? targetI : simpleMatch[0]!

        let resultScore = matchI === 0 ? 0 : -matchI * matchI * 0.2
        if (!strict) resultScore *= 1000
        else if (beginningsLen > 24) resultScore *= (beginningsLen - 24) * 10
        indexes[0] = matchI
        indexesLen = 1
        return resultScore - (targetLen - 1)
    }

    searchI = 0
    let strict = false
    let strictLen = 0
    let beginningLen = 1
    for (let i = next[0]!; i < targetLen; i = next[i]!) beginningLen++

    let substringI = searchLen <= 1 ? -1 : targetLower.indexOf(search.lower, simpleMatch[0])
    const isSubstring = substringI !== -1
    let substringStart = isSubstring && (substringI === 0 || next[substringI - 1] === substringI)

    if (substringStart && substringI === simpleMatch[0]) {
        strict = true
    }
    else {
        targetI = simpleMatch[0] === 0 ? 0 : next[simpleMatch[0]! - 1]!
        let backtracks = 0
        if (targetI !== targetLen) {
            for (;;) {
                if (targetI >= targetLen) {
                    if (searchI <= 0 || ++backtracks > 200) break
                    searchI--
                    const previous = strictMatch[--strictLen]!
                    targetI = next[previous]!
                }
                else if (searchCodes[searchI] === targetLower.charCodeAt(targetI)) {
                    strictMatch[strictLen++] = targetI
                    if (++searchI === searchLen) {
                        strict = true
                        break
                    }
                    targetI++
                }
                else {
                    targetI = next[targetI]!
                }
            }
        }
    }

    if (isSubstring && !substringStart) {
        for (let i = 0; i < targetLen; i = next[i]!) {
            if (i <= substringI) continue
            let s = 0
            for (; s < searchLen && i + s < targetLen && searchCodes[s] === targetLower.charCodeAt(i + s); s++);
            if (s === searchLen) {
                substringI = i
                substringStart = true
                break
            }
        }
    }

    let matches = strictMatch
    if (!strict || substringStart) {
        if (isSubstring) for (let i = 0; i < searchLen; i++) simpleMatch[i] = substringI + i
        matches = simpleMatch
    }

    const matchEnd = matches[searchLen - 1]! + 1
    const substringEnd = isSubstring && matchEnd - matches[0]! === searchLen && (matchEnd === targetLen || next[matchEnd - 1] === matchEnd)
    const result = calculateScore(matches, searchLen, strict, beginningLen, isSubstring, substringStart, substringEnd)
    for (let i = 0; i < searchLen; i++) indexes[i] = matches[i]!
    indexesLen = searchLen
    return result
}

function calculateScore(matches: Int32Array, searchLen: number, strict: boolean, beginningLen: number, substring: boolean, substringStart: boolean, substringEnd: boolean): number {
    let result = 0
    let groups = 0
    for (let i = 1; i < searchLen; i++) {
        if (matches[i]! - matches[i - 1]! !== 1) {
            result -= matches[i]!
            groups++
        }
    }
    const unmatchedDistance = matches[searchLen - 1]! - matches[0]! - (searchLen - 1)
    result -= (12 + unmatchedDistance) * groups
    if (matches[0] !== 0) result -= matches[0]! * matches[0]! * 0.2
    if (!strict) result *= 1000
    else if (beginningLen > 24) result *= (beginningLen - 24) * 10

    const lengthPenalty = (targetLen - searchLen) / 2
    result -= lengthPenalty
    const substringBonus = 1 + searchLen * searchLen
    if (substring) result /= substringBonus
    if (substringStart) result /= substringBonus
    result -= lengthPenalty
    return substringEnd ? result + Math.min(4, -result / 2) : result
}

function algorithmSpaces(search: Query): number | undefined {
    let result = 0
    let previousFirst = 0
    let changesLen = 0
    const parts = search.parts

    for (let i = 0; i < parts.length; i++) {
        const partScore = algorithm(parts[i]!, false, changesLen !== 0, false)
        if (partScore === undefined) {
            resetBeginnings(changesLen)
            return undefined
        }

        // Characters in a row end a word for the parts after them.
        if (i < parts.length - 1) {
            let consecutive = true
            for (let j = 0; j < indexesLen - 1; j++) {
                if (indexes[j + 1]! - indexes[j]! !== 1) {
                    consecutive = false
                    break
                }
            }
            if (consecutive) {
                const beginning = indexes[indexesLen - 1]! + 1
                const previous = next[beginning - 1]!
                for (let j = beginning - 1; j >= 0 && next[j] === previous; j--) {
                    next[j] = beginning
                    changes[changesLen * 2] = j
                    changes[changesLen * 2 + 1] = previous
                    changesLen++
                }
            }
        }

        result += partScore / parts.length
        // Parts found in another order than they were typed in are worse.
        if (indexes[0]! < previousFirst) result -= (previousFirst - indexes[0]!) * 2
        previousFirst = indexes[0]!
    }

    resetBeginnings(changesLen)

    // The needle as one, spaces included, when the haystack has spaces as well.
    if (targetLower.includes(" ")) {
        const spaced = algorithm(search, true, false, true)
        if (spaced !== undefined && spaced > result) return spaced
    }

    return result
}

function resetBeginnings(changesLen: number): void {
    for (let i = changesLen - 1; i >= 0; i--) next[changes[i * 2]!] = changes[i * 2 + 1]!
}

function normalizeScore(value: number): number {
    if (value > 1) return value
    return Math.E ** (((-value + 1) ** 0.04307 - 1) * -2)
}

function lowerBound(start: number, end: number, value: number): number {
    while (start < end) {
        const middle = (start + end) >> 1
        if (beginnings[middle]! < value) start = middle + 1
        else end = middle
    }
    return start
}

function isBeginning(index: number): boolean {
    const found = lowerBound(0, beginningsLen, index)
    return found < beginningsLen && beginnings[found] === index
}
