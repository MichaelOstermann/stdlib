import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { CLI } from "../../src/CLI"

describe("colors", () => {
    let saved: string | undefined

    beforeEach(() => {
        saved = process.env["FORCE_COLOR"]
        process.env["FORCE_COLOR"] = "1"
    })

    afterEach(() => {
        if (saved === undefined) delete process.env["FORCE_COLOR"]
        else process.env["FORCE_COLOR"] = saved
    })

    it("wraps text in the codes of a style", () => {
        expect(CLI.red("error")).toBe("\x1b[31merror\x1b[39m")
    })

    it("turns the outer color back on after a nested one", () => {
        expect(CLI.blue(`a ${CLI.red("b")} c`)).toBe("\x1b[34ma \x1b[31mb\x1b[34m c\x1b[39m")
    })

    it("keeps bold on after a nested dim, which closes the same way", () => {
        expect(CLI.bold(`a ${CLI.dim("b")} c`)).toBe("\x1b[1ma \x1b[2mb\x1b[22m\x1b[1m c\x1b[22m")
    })

    it("has no bright colors and no gray", () => {
        expect(Object.keys(CLI)).not.toContain("gray")
        expect(Object.keys(CLI).filter((name) => name.endsWith("Bright"))).toEqual([])
    })
})
