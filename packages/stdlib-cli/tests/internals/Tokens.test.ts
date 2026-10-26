import { describe, expect, it } from "bun:test"
import { Tokens } from "../../src/internals/Tokens"

function values(tokens: Tokens): string[] {
    const result: string[] = []
    for (let token = tokens.head; token; token = token.next) result.push(token.value)
    return result
}

describe("Tokens", () => {
    it("keeps argv in order", () => {
        expect(values(Tokens(["add", "--name", "John"]))).toEqual(["add", "--name", "John"])
    })

    it("is empty for an empty argv", () => {
        const tokens = Tokens([])
        expect(tokens.head).toBeUndefined()
        expect(tokens.tail).toBeUndefined()
    })

    it("finds the flags", () => {
        const flags = Tokens(["add", "--name", "John", "-x", "-", "--"]).flags()
        expect(flags.map((token) => token.value)).toEqual(["--name", "-x", "--"])
    })

    it("does not count a lone dash as a flag", () => {
        expect(Tokens(["-"]).head!.isFlag()).toBe(false)
        expect(Tokens(["--name"]).head!.isFlag()).toBe(true)
        expect(Tokens(["name"]).head!.isFlag()).toBe(false)
    })

    it("removes from the middle, the start and the end", () => {
        const tokens = Tokens(["a", "b", "c", "d"])
        tokens.head!.next!.remove()
        expect(values(tokens)).toEqual(["a", "c", "d"])
        tokens.head!.remove()
        expect(values(tokens)).toEqual(["c", "d"])
        tokens.tail!.remove()
        expect(values(tokens)).toEqual(["c"])
        expect(tokens.head).toBe(tokens.tail)
    })

    it("does nothing when a token is removed twice", () => {
        const tokens = Tokens(["a", "b", "c"])
        const b = tokens.head!.next!
        b.remove()
        b.remove()
        expect(values(tokens)).toEqual(["a", "c"])
    })
})
