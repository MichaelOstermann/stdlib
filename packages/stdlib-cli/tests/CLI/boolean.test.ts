import type { Outcome } from "../../src/CLI"
import { describe, expect, it } from "bun:test"
import { CLI } from "../../src/CLI"

const list = CLI.command({
    name: "list",
    handler() {},
    options: {
        json: CLI.boolean({ desc: "Print JSON" }),
        vault: { desc: "Vault to list", optional: true },
    },
})

function resolve(line: string): Promise<Outcome> {
    return CLI.resolve(list, line ? line.split(" ") : [], { interactive: false })
}

async function values(line: string): Promise<unknown> {
    const outcome = await resolve(line)
    return outcome.type === "run" ? outcome.values : outcome.errors
}

describe("boolean", () => {
    it("is true when given, false when not", async () => {
        expect(await values("--json")).toEqual({ json: true, vault: undefined })
        expect(await values("--vault Home")).toEqual({ json: false, vault: "Home" })
        expect(await values("--json --vault Home")).toEqual({ json: true, vault: "Home" })
    })

    it("takes true or false, yes or no, on or off in any case, after it or after =", async () => {
        expect(await values("--json false")).toEqual({ json: false, vault: undefined })
        expect(await values("--json true --vault Home")).toEqual({ json: true, vault: "Home" })
        expect(await values("--json=false")).toEqual({ json: false, vault: undefined })
        for (const word of ["no", "off", "NO", "Off", "False"]) expect(await values(`--json ${word}`)).toEqual({ json: false, vault: undefined })
        for (const word of ["yes", "on", "YES", "On", "True"]) expect(await values(`--json=${word}`)).toEqual({ json: true, vault: undefined })
    })

    it("reports anything else after =", async () => {
        expect(await values("--json=maybe")).toEqual([{ message: "Not yes or no", name: "json", type: "InvalidFlag" }])
        expect(await values("--json=constructor")).toEqual([{ message: "Not yes or no", name: "json", type: "InvalidFlag" }])
    })

    it("leaves other words, which are reported", async () => {
        expect(await values("--json extra")).toEqual([{ candidates: [], type: "UnknownFlag", value: "extra" }])
        expect(await values("--json constructor")).toEqual([{ candidates: [], type: "UnknownFlag", value: "constructor" }])
        expect(await values("--json vault Home")).toEqual([
            { candidates: ["vault"], type: "UnknownFlag", value: "vault" },
            { candidates: [], type: "UnknownFlag", value: "Home" },
        ])
    })

    it("shows no value in help", () => {
        expect(CLI.format({ command: list, path: ["list"], type: "help" })).toContain(
            [
                "  --json           Print JSON (Default: false)",
                "  --vault <value>  Vault to list (Optional)",
            ].join("\n"),
        )
    })
})

describe("read", () => {
    it("reads a value its own way, with its own usage in help", async () => {
        const head = CLI.command({
            name: "head",
            handler() {},
            options: {
                lines: {
                    desc: "Lines to show",
                    parse: Number,
                    usage: "<n>",
                    // Only the next word, so the rest stays for whatever comes after.
                    read: (token) => {
                        const next = token.next
                        if (!next || next.isFlag()) return undefined
                        next.remove()
                        return next.value
                    },
                },
            },
        })
        const outcome = await CLI.resolve(head, ["--lines", "5"], { interactive: false })
        expect(outcome.type === "run" && outcome.values).toEqual({ lines: 5 })
        const leftover = await CLI.resolve(head, ["--lines", "5", "6"], { interactive: false })
        expect(leftover.type === "error" && leftover.errors).toEqual([{ candidates: [], type: "UnknownFlag", value: "6" }])
        const missing = await CLI.resolve(head, ["--lines"], { interactive: false })
        expect(missing.type === "error" && missing.errors).toEqual([{ message: "Requires a value", name: "lines", type: "InvalidFlag" }])
        expect(CLI.format({ command: head, path: ["head"], type: "help" })).toContain("  --lines <n>  Lines to show")
    })
})
