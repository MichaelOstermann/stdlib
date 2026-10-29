import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { CLI } from "../../src/CLI"

const add = CLI.command({
    desc: "Add a member",
    name: "add",
    handler() {},
    options: {
        firstName: { desc: "First name", example: "Jane" },
        nickname: { desc: "Shown instead of the first name where there is room for it", optional: true },
        secret: { desc: "Only for tests", hidden: true, optional: true },
        port: {
            default: "3000",
            desc: "Port to listen on",
            parse: (value) => {
                if (!/^\d+$/.test(value)) throw new Error("Not a whole number")
                return Number(value)
            },
        },
    },
})

const commands = [
    CLI.command({
        desc: "Manage members",
        name: "members",
        commands: [
            add,
            CLI.command({ desc: "Remove a member", name: "remove", handler() {} }),
            CLI.command({ desc: "Rename a member", name: "rekked", handler() {} }),
            CLI.command({ hidden: true, name: "purge", handler() {} }),
        ],
    }),
]

async function format(line: string): Promise<string> {
    return CLI.format(await CLI.resolve(CLI.command({ commands, name: "miko" }), line.split(" "), { interactive: false }))
}

let columns: number | undefined

beforeEach(() => {
    columns = process.stdout.columns
    process.stdout.columns = 60
})

afterEach(() => {
    process.stdout.columns = columns!
})

describe("format", () => {
    it("is empty for a command that runs", async () => {
        expect(await format("members add --first-name Jane")).toBe("")
    })

    it("lists the commands of a command that only groups others", async () => {
        expect(await format("members")).toBe(
            [
                "miko members",
                "Manage members",
                "",
                "Commands:",
                "  add     Add a member",
                "  remove  Remove a member",
                "  rekked  Rename a member",
            ].join("\n"),
        )
    })

    it("suggests the commands an unknown one could be", async () => {
        expect(await format("members re")).toBe(
            [
                "Unknown command: re Did you mean: remove, rekked",
                "",
                "Commands:",
                "  remove  Remove a member",
                "  rekked  Rename a member",
                "",
                "See all commands: miko members --help",
            ].join("\n"),
        )
    })

    it("lists every command when nothing is close", async () => {
        expect(await format("members xyz")).toBe(
            [
                "Unknown command: xyz",
                "",
                "Commands:",
                "  add     Add a member",
                "  remove  Remove a member",
                "  rekked  Rename a member",
                "",
                "See all commands: miko members --help",
            ].join("\n"),
        )
    })

    it("suggests the options unknown flags could be, required first", async () => {
        expect(await format("members add --nme Jane --fn Jane")).toBe(
            [
                "Unknown flag: --nme Did you mean: --nickname, --first-name",
                "Unknown flag: --fn Did you mean: --first-name",
                "",
                "Options:",
                "  --first-name <value>  First name (Example: Jane)",
                "  --nickname <value>    Shown instead of the first name",
                "                        where there is room for it",
                "                        (Optional)",
                "",
                "See all options: miko members add --help",
            ].join("\n"),
        )
    })

    it("lists every option when no flag is close", async () => {
        expect(await format("members add --xyz")).toBe(
            [
                "Unknown flag: --xyz",
                "",
                "Options:",
                "  --first-name <value>  First name (Example: Jane)",
                "  --nickname <value>    Shown instead of the first name",
                "                        where there is room for it",
                "                        (Optional)",
                "  --port <value>        Port to listen on (Default: 3000)",
                "",
                "See all options: miko members add --help",
            ].join("\n"),
        )
    })

    it("lists problems with values, then only the affected options", async () => {
        expect(await format("members add --port abc --nickname J --nickname K")).toBe(
            [
                "Missing flag: --first-name",
                "Invalid flag: --nickname Given more than once",
                "Invalid flag: --port Not a whole number",
                "",
                "Options:",
                "  --first-name <value>  First name (Example: Jane)",
                "  --nickname <value>    Shown instead of the first name",
                "                        where there is room for it",
                "                        (Optional)",
                "  --port <value>        Port to listen on (Default: 3000)",
                "",
                "See all options: miko members add --help",
            ].join("\n"),
        )
        expect(await format("members add --first-name Jane --port abc")).toBe(
            [
                "Invalid flag: --port Not a whole number",
                "",
                "Options:",
                "  --port <value>  Port to listen on (Default: 3000)",
                "",
                "See all options: miko members add --help",
            ].join("\n"),
        )
    })

    it("does not show typed values for problems with values", async () => {
        const text = await format("members add --first-name Jane --port secret123")
        expect(text).not.toContain("secret123")
        expect(text).not.toContain("Jane\n")
    })

    it("shows a hidden option only when an error names it", async () => {
        expect(await format("members add --first-name Jane --secret a --secret b")).toBe(
            [
                "Invalid flag: --secret Given more than once",
                "",
                "Options:",
                "  --secret <value>  Only for tests (Optional)",
                "",
                "See all options: miko members add --help",
            ].join("\n"),
        )
        expect(await format("members add --xyz")).not.toContain("--secret")
        expect(await format("members add --sec")).not.toContain("--secret")
    })

    it("leaves long lines as they are when the width of the terminal is unknown", async () => {
        process.stdout.columns = undefined!
        expect(await format("members add --nickname")).toContain("  --nickname <value>    Shown instead of the first name where there is room for it (Optional)")
    })
})
