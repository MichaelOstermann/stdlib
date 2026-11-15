import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test"
import { CLI } from "../../src"

const add = CLI
    .command()
    .desc("Add a member")
    .options({ email: CLI.string().desc("Their email address") })
    .action(({ email }) => {
        if (email === "taken@miko.dev") return Err("This email is already a member")
        if (email === "crash@miko.dev") throw new Error("Database went away")
        if (email === "quiet@miko.dev") return
        return Ok({ email })
    })
const members = CLI.command().desc("Manage who has access").commands({ add })
const serve = CLI.command().desc("Start the server").action(() => Ok("Listening"))
const status = CLI
    .command()
    .format((result) => `${result.ok ? "ok" : "err"} ${String(result.value)}`)
    .action(() => Ok({ up: true }))
    .format((result) => result.ok ? `Up: ${result.value.up}` : "Down")
const rpc = CLI.command().desc("For programs, prints JSON").commands({ members, serve })
const miko = CLI.command().desc("Everything miko").commands({ members, rpc, serve, status })

let stdout = ""
let stderr = ""

const isTTY = process.stdout.isTTY

beforeEach(() => {
    process.stdout.isTTY = false
    process.exitCode = 0
    stdout = ""
    stderr = ""
    spyOn(process.stdout, "write").mockImplementation((chunk) => {
        stdout += String(chunk)
        return true
    })
    spyOn(process.stderr, "write").mockImplementation((chunk) => {
        stderr += String(chunk)
        return true
    })
})

afterEach(() => {
    process.stdout.isTTY = isTTY
    process.exitCode = 0
})

function run(line: string): Promise<void> {
    return CLI.run(miko, { argv: line.split(" "), name: "miko", rpc, version: "1.2.0" })
}

describe("CLI.run", () => {
    it("should print what the action returns", async () => {
        await run("serve")
        expect(stdout).toBe("Listening\n")
        await run("members add --email a@b.c")
        expect(stdout).toBe("Listening\nemail: a@b.c\n")
        expect(stderr).toBe("")
        expect(process.exitCode).toBe(0)
    })

    it("should print with the last format", async () => {
        await run("status")
        expect(stdout).toBe("Up: true\n")
    })

    it("should print nothing when the action returns nothing", async () => {
        await run("members add --email quiet@miko.dev")
        expect(stdout).toBe("")
        expect(stderr).toBe("")
    })

    it("should print an Err on stderr, with exit code 1", async () => {
        await run("members add --email taken@miko.dev")
        expect(stdout).toBe("")
        expect(Bun.stripANSI(stderr)).toBe("Error: This email is already a member\n")
        expect(process.exitCode).toBe(1)
    })

    it("should print what the action throws on stderr, with exit code 1", async () => {
        await run("members add --email crash@miko.dev")
        expect(Bun.stripANSI(stderr)).toBe("Error: Database went away\n")
        expect(process.exitCode).toBe(1)
    })

    it("should print unknown commands and wrong options on stderr, with exit code 1", async () => {
        await run("membres")
        expect(Bun.stripANSI(stderr)).toStartWith("Unknown command membres, did you mean: members?\n")
        expect(process.exitCode).toBe(1)
        stderr = ""
        await run("members add --emial a@b.c")
        expect(Bun.stripANSI(stderr)).toStartWith("Missing option --email\nUnknown option --emial, did you mean: --email?\n")
    })

    it("should print the help for --help anywhere, and for commands without an action", async () => {
        await run("members add --email a@b.c --help")
        expect(Bun.stripANSI(stdout)).toStartWith("Command:\n  miko members add\n")
        expect(Bun.stripANSI(stdout)).toContain("  --help   Show this help")
        stdout = ""
        await run("members")
        expect(Bun.stripANSI(stdout)).toStartWith("Command:\n  miko members\n")
        expect(process.exitCode).toBe(0)
    })

    it("should print the version for --version after the name of the program", async () => {
        await run("--version")
        expect(stdout).toBe("1.2.0\n")
        expect(process.exitCode).toBe(0)
    })

    it("should list --version in the help of the program only", async () => {
        await run("--help")
        expect(Bun.stripANSI(stdout)).toContain("  --version  Show the version")
        stdout = ""
        await run("members --help")
        expect(Bun.stripANSI(stdout)).not.toContain("--version")
    })

    it("should not know --version below the program", async () => {
        await run("members add --version")
        expect(Bun.stripANSI(stderr)).toContain("Unknown option --version")
        expect(process.exitCode).toBe(1)
    })

    it("should call onError with what the action throws, in the terminal and for rpc", async () => {
        const thrown: unknown[] = []
        const onError = (error: unknown): void => {
            thrown.push(error)
        }
        await CLI.run(miko, { argv: ["members", "add", "--email", "crash@miko.dev"], name: "miko", onError, rpc })
        await CLI.run(miko, { argv: ["rpc", "members", "add", "--email", "crash@miko.dev"], name: "miko", onError, rpc })
        await CLI.run(miko, { argv: ["members", "add", "--email", "taken@miko.dev"], name: "miko", onError, rpc })
        expect(thrown.map((error) => (error as Error).message)).toEqual(["Database went away", "Database went away"])
    })

    describe("rpc", () => {
        it("should print what the action returns as JSON", async () => {
            await run("rpc members add --email a@b.c")
            expect(stdout).toBe('{"value":{"email":"a@b.c"},"ok":true}\n')
            expect(process.exitCode).toBe(0)
        })

        it("should print every problem as JSON on stdout, without an exit code", async () => {
            await run("rpc members add --email taken@miko.dev")
            await run("rpc members add")
            await run("rpc membres")
            await run("rpc members nope")
            expect(stdout.trimEnd().split("\n").map((line) => JSON.parse(line))).toEqual([
                { ok: false, value: { message: "This email is already a member", name: "Error" } },
                {
                    ok: false,
                    value: {
                        errors: [{ message: "Missing option --email", meta: { option: "email" }, name: "CLIMissingOptionError" }],
                        message: "Invalid options",
                        name: "CLIOptionsError",
                    },
                },
                { ok: false, value: { message: "Unknown command membres", meta: { input: "membres" }, name: "CLIUnknownCommandError" } },
                { ok: false, value: { message: "Unknown command nope", meta: { input: "nope" }, name: "CLIUnknownCommandError" } },
            ])
            expect(stderr).toBe("")
            expect(process.exitCode).toBe(0)
        })

        it("should print what the action throws as JSON", async () => {
            await run("rpc members add --email crash@miko.dev")
            const result = JSON.parse(stdout)
            expect(result.ok).toBe(false)
            expect(result.value.name).toBe("CLIUnhandledExceptionError")
            expect(result.value.cause.message).toBe("Database went away")
            expect(result.value.cause.stack).toStartWith("Error: Database went away\n")
        })

        it("should print null when the action returns nothing", async () => {
            await run("rpc members add --email quiet@miko.dev")
            expect(stdout).toBe('{"value":null,"ok":true}\n')
        })

        it("should print the help for --help, and for commands without an action", async () => {
            await run("rpc members add --help")
            expect(Bun.stripANSI(stdout)).toStartWith("Command:\n  miko rpc members add\n")
            stdout = ""
            await run("rpc")
            expect(Bun.stripANSI(stdout)).toStartWith("Command:\n  miko rpc\n")
        })

        it("should leave the same commands outside rpc as they are", async () => {
            await run("members add --email taken@miko.dev")
            expect(stdout).toBe("")
            expect(process.exitCode).toBe(1)
        })
    })
})
