import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

const add = CLI.command().desc("Add a member\nThey get an email.").options({ email: CLI.string().desc("Their email address") }).action(() => {})

const remove = CLI.command().action(() => {})

const members = CLI.command().desc("Manage who has access\nAdd and remove them.").commands({ add, remove })

const rpc = CLI.command().commands({ members })

const miko = CLI.command().commands({ members, rpc })

describe("CLI.commands.pickable", () => {
    it("should list the commands below with an action, without the ones filtered out", () => {
        const root = CLI.commands.nearest(miko, [])
        expect(CLI.commands.pickable(root).map((entry) => entry.path)).toEqual([["members", "add"], ["members", "remove"], ["rpc", "members", "add"], ["rpc", "members", "remove"]])
        expect(CLI.commands.pickable(root, (command) => command !== rpc).map((entry) => entry.path)).toEqual([["members", "add"], ["members", "remove"]])
    })
})
