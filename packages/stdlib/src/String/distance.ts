/**
 * # distance
 *
 * How many characters have to be added, removed, replaced, or swapped with the one next to them, to
 * turn `a` into `b`. For finding what was probably meant by a typo.
 *
 * ## Example
 *
 * ```ts
 * String.distance("members", "members"); // 0
 * String.distance("membres", "members"); // 1
 * String.distance("serve", "members"); // 5
 * ```
 */
export function distance(a: string, b: string): number {
    const rows = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i + j * Number(i === 0)))
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = Number(a[i - 1] !== b[j - 1])
            rows[i]![j] = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + cost)
            const swapped = i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]
            if (swapped) rows[i]![j] = Math.min(rows[i]![j]!, rows[i - 2]![j - 2]! + 1)
        }
    }
    return rows[a.length]![b.length]!
}
