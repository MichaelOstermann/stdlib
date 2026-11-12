import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

describe("CLI.commands.pick", () => {
    it("should not ask when there is nothing below that does something", async () => {
        const empty = CLI.command().commands({ group: CLI.command() })
        expect(await CLI.commands.pick({ command: empty, path: ["miko"] })).toBeUndefined()
    })

    it("should not offer the commands under rpc", async () => {
        const serve = CLI.command().action(() => {})
        const rpc = CLI.command().commands({ serve })
        expect(await CLI.commands.pick({ command: CLI.command().commands({ rpc }), path: ["miko"], rpc })).toBeUndefined()
    })
})
