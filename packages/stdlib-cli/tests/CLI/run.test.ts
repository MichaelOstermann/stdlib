import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test"
import { CLI } from "../../src"

const add = CLI
    .command()
    .desc("Add a member")
    .options({ email: CLI.string().desc("Their email address") })
    .action(({ email }) => {
        if (email === "taken@miko.dev") return Err("This email is already a member")
        if (email === "crash@miko.dev") throw new Error("Database went away")
        if (email === "big@miko.dev") return Ok(10n)
        if (email === "quiet@miko.dev") return
        return Ok({ email })
    })
const members = CLI.command().desc("Manage who has access").commands({ add })
const serve = CLI.command().desc("Start the server").action(() => Ok("Listening"))
const rpc = CLI.command().desc("For programs, prints JSON").commands({ members, serve })
const miko = CLI.command().desc("Everything miko").commands({ members, rpc, serve })

let stdout = ""
let stderr = ""

beforeEach(() => {
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
    process.exitCode = 0
})

function run(line: string, encode?: (result: Result<unknown, unknown>) => string): Promise<void> {
    return CLI.run(miko, { argv: line.split(" "), encode, name: "miko", rpc })
}

describe("CLI.run", () => {
    it("should print what the action returns", async () => {
        await run("serve")
        expect(stdout).toBe("Listening\n")
        await run("members add --email a@b.c")
        expect(stdout).toBe('Listening\n{\n  email: "a@b.c",\n}\n')
        expect(stderr).toBe("")
        expect(process.exitCode).toBe(0)
    })

    it("should print nothing when the action returns nothing", async () => {
        await run("members add --email quiet@miko.dev")
        expect(stdout).toBe("")
        expect(stderr).toBe("")
    })

    it("should print an Err on stderr, with exit code 1", async () => {
        await run("members add --email taken@miko.dev")
        expect(stdout).toBe("")
        expect(Bun.stripANSI(stderr)).toBe("This email is already a member\n")
        expect(process.exitCode).toBe(1)
    })

    it("should print what the action throws on stderr, with exit code 1", async () => {
        await run("members add --email crash@miko.dev")
        expect(Bun.stripANSI(stderr)).toStartWith("Error: Database went away\n    at ")
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
                { ok: false, value: "This email is already a member" },
                { ok: false, value: { errors: [{ option: "email", type: "CLIMissingOptionError" }], type: "CLIOptionsError" } },
                { ok: false, value: { input: "membres", type: "CLIUnknownCommandError" } },
                { ok: false, value: { input: "nope", type: "CLIUnknownCommandError" } },
            ])
            expect(stderr).toBe("")
            expect(process.exitCode).toBe(0)
        })

        it("should print what the action throws as JSON", async () => {
            await run("rpc members add --email crash@miko.dev")
            const result = JSON.parse(stdout)
            expect(result.ok).toBe(false)
            expect(result.value.type).toBe("CLIUnhandledExceptionError")
            expect(result.value.message).toBe("Database went away")
            expect(result.value.stack).toStartWith("Error: Database went away\n")
        })

        it("should print what encode throws as JSON", async () => {
            await run("rpc members add --email big@miko.dev")
            const result = JSON.parse(stdout)
            expect(result.value.type).toBe("CLIUnhandledExceptionError")
            expect(result.value.message).toContain("BigInt")
        })

        it("should print with encode", async () => {
            await run("rpc serve", (result) => `${result.ok ? "ok" : "err"} ${String(result.value)}\n`)
            expect(stdout).toBe("ok Listening\n")
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
