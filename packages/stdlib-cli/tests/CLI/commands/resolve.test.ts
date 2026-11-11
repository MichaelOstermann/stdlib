import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

const add = CLI.command().desc("Add a member").options({ email: CLI.string() }).action(() => {})
const remove = CLI.command().desc("Remove a member").action(() => {})
const members = CLI.command().desc("Manage who has access").commands({ add, remove })
const serve = CLI.command().desc("Start the server\nOn port 3000").action(() => {})
const miko = CLI.command().commands({ members, serve })

function resolve(line: string): ReturnType<typeof CLI.commands.resolve> {
    return CLI.commands.resolve({ argv: line ? line.split(" ") : [], command: miko })
}

describe("CLI.commands.resolve", () => {
    it("should follow the words down the subcommands", () => {
        expect(resolve("members add --email a@b.c")).toEqual({
            argv: ["--email", "a@b.c"],
            command: add,
            parents: [miko, members],
            path: ["members", "add"],
        })
    })

    it("should stop at the end of argv", () => {
        expect(resolve("")).toEqual({ argv: [], command: miko, parents: [], path: [] })
        expect(resolve("members")).toEqual({ argv: [], command: members, parents: [miko], path: ["members"] })
    })

    it("should stop at the first word that starts with -", () => {
        expect(resolve("members --help add")).toEqual({ argv: ["--help", "add"], command: members, parents: [miko], path: ["members"] })
        expect(resolve("-h")).toEqual({ argv: ["-h"], command: miko, parents: [], path: [] })
    })

    it("should stop at a command without subcommands", () => {
        expect(resolve("serve now")).toEqual({ argv: ["now"], command: serve, parents: [miko], path: ["serve"] })
    })

    it("should not take inherited properties for subcommands", () => {
        expect(resolve("toString").error).toEqual({ input: "toString", type: "CLIUnknownCommandError" })
    })

    it("should report an unknown command with what it was probably meant to be", () => {
        const resolved = resolve("members ad")
        expect(resolved.error).toEqual({ input: "ad", type: "CLIUnknownCommandError" })
        expect(resolved.command).toBe(members)
        expect(resolved.parents).toEqual([miko])
        expect(resolved.path).toEqual(["members"])
        expect(Bun.stripANSI(resolved.message!)).toBe([
            "Unknown command ad, did you mean: add?",
            "",
            "Commands:",
            "  add  Add a member",
        ].join("\n"))
    })

    it("should list every command when nothing comes close", () => {
        expect(Bun.stripANSI(resolve("xyz").message!)).toBe([
            "Unknown command xyz",
            "",
            "Commands:",
            "  members  Manage who has access",
            "  serve    Start the server",
        ].join("\n"))
    })
})
