import { Err, Ok } from "@monstermann/stdlib"
import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

const add = CLI.command().desc("Add a member\nThey get an email.").options({ email: CLI.string().desc("Their email address") }).action(() => {})

const remove = CLI.command().action(() => {})

const members = CLI.command().desc("Manage who has access\nAdd and remove them.").commands({ add, remove })

const rpc = CLI.command().commands({ members })

const miko = CLI.command().commands({ members, rpc })

describe("CLI.resolveCommand", () => {
    it("should find the command by the names that lead to it", () => {
        expect(CLI.resolveCommand(miko, [])).toEqual(Ok({ command: miko, parents: [], path: [] }))
        expect(CLI.resolveCommand(miko, ["members", "add"])).toEqual(Ok({ command: add, parents: [miko, members], path: ["members", "add"] }))
    })

    it("should fail for the first name that is not one", () => {
        expect<unknown>(CLI.resolveCommand(miko, ["members", "ad", "x"])).toEqual(Err({ message: "Unknown command ad", name: "CLIUnknownCommandError" }))
        expect<unknown>(CLI.resolveCommand(miko, ["toString"])).toEqual(Err({ message: "Unknown command toString", name: "CLIUnknownCommandError" }))
    })
})
