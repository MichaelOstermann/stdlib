import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

const add = CLI.command().desc("Add a member\nThey get an email.").options({ email: CLI.string().desc("Their email address") }).action(() => {})

const remove = CLI.command().action(() => {})

const members = CLI.command().desc("Manage who has access\nAdd and remove them.").commands({ add, remove })

const rpc = CLI.command().commands({ members })

const miko = CLI.command().commands({ members, rpc })

describe("CLI.nearestCommand", () => {
    it("should stop at the last command on the way", () => {
        expect(CLI.nearestCommand(miko, ["members", "ad", "x"])).toEqual({ command: members, parents: [miko], path: ["members"] })
    })
})
