import type { Token } from "./Tokens"

/**
 * Takes every word after the flag up to the next flag, joined with spaces: `--name Mary Ann` is
 * `Mary Ann`, as is `--name=Mary Ann`. `undefined` when there are none.
 */
export function readWords(token: Token): string | undefined {
    const words: string[] = []
    while (token.next && !token.next.isFlag()) {
        words.push(token.next.value)
        token.next.remove()
    }
    return words.length ? words.join(" ") : undefined
}
