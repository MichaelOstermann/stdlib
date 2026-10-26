export interface Token {
    index: number
    next: Token | undefined
    prev: Token | undefined
    tokens: Tokens
    value: string
    /** Whether it starts with `-`. A lone `-` does not count. */
    isFlag: () => boolean
    remove: () => void
}

export interface Tokens {
    head: Token | undefined
    tail: Token | undefined
    flags: () => Token[]
}

export function Tokens(args: string[]): Tokens {
    const tokens: Tokens = {
        head: undefined,
        tail: undefined,
        flags() {
            const flags: Token[] = []
            for (let token = tokens.head; token; token = token.next) {
                if (token.isFlag()) flags.push(token)
            }
            return flags
        },
    }

    for (const [index, value] of args.entries()) {
        const token: Token = {
            index,
            next: undefined,
            prev: tokens.tail,
            tokens,
            value,
            isFlag: () => value !== "-" && value.startsWith("-"),
            remove() {
                if (token.prev) token.prev.next = token.next
                else if (tokens.head === token) tokens.head = token.next
                else return
                if (token.next) token.next.prev = token.prev
                else tokens.tail = token.prev
                token.prev = undefined
                token.next = undefined
            },
        }
        if (tokens.tail) tokens.tail.next = token
        else tokens.head = token
        tokens.tail = token
    }

    return tokens
}
