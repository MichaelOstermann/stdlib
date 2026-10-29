import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test"
import { CLI } from "../../src/CLI"

let ran: unknown
const program = CLI.command({
    desc: "Greets someone",
    name: "greet",
    commands: [
        CLI.command({
            desc: "Says hello",
            name: "hello",
            options: { name: { desc: "Who to greet" } },
            handler: async ({ name }) => {
                ran = name
            },
        }),
    ],
})

let stdout: ReturnType<typeof spyOn>
let stderr: ReturnType<typeof spyOn>

beforeEach(() => {
    ran = undefined
    process.exitCode = 0
    stdout = spyOn(process.stdout, "write").mockImplementation(() => true)
    stderr = spyOn(process.stderr, "write").mockImplementation(() => true)
})

afterEach(() => {
    stdout.mockRestore()
    stderr.mockRestore()
    process.exitCode = 0
})

describe("run", () => {
    it("calls the handler with the values", async () => {
        await CLI.run(program, { argv: ["hello", "--name", "Jane"] })
        expect(ran).toBe("Jane")
        expect(stdout).not.toHaveBeenCalled()
        expect(stderr).not.toHaveBeenCalled()
        expect(process.exitCode).toBe(0)
    })

    it("prints help that was asked for to stdout", async () => {
        for (const flag of ["--help", "-h", "--HELP"]) {
            await CLI.run(program, { argv: [flag] })
            expect(stdout).toHaveBeenLastCalledWith("greet\nGreets someone\n\nCommands:\n  hello  Says hello\n")
        }
        await CLI.run(program, { argv: ["hello", "--name", "Jane", "--xyz", "--help"] })
        expect(stdout).toHaveBeenLastCalledWith("greet hello\nSays hello\n\nOptions:\n  --name  Who to greet\n")
        expect(ran).toBeUndefined()
        expect(process.exitCode).toBe(0)
    })

    it("prints help to stderr and exits with 1 when nothing is given", async () => {
        await CLI.run(program, { argv: [] })
        expect(stderr).toHaveBeenCalledWith("greet\nGreets someone\n\nCommands:\n  hello  Says hello\n")
        await CLI.run(program, { argv: ["hello"] })
        expect(stderr).toHaveBeenLastCalledWith("greet hello\nSays hello\n\nOptions:\n  --name  Who to greet\n")
        expect(ran).toBeUndefined()
        expect(process.exitCode).toBe(1)
    })

    it("prints errors to stderr and exits with 1", async () => {
        await CLI.run(program, { argv: ["hello", "--nme", "Jane"] })
        expect(stderr).toHaveBeenCalledWith("Unknown flag: --nme Did you mean: --name\n\nOptions:\n  --name  Who to greet\n\nSee all options: greet hello --help\n")
        expect(ran).toBeUndefined()
        expect(process.exitCode).toBe(1)
    })

    it("does not report help after an unknown command", async () => {
        await CLI.run(program, { argv: ["xyz", "--help"] })
        expect(stdout).not.toHaveBeenCalled()
        expect(process.exitCode).toBe(1)
    })

    it("prints what the handler throws to stderr and exits with 1", async () => {
        const failing = CLI.command({
            name: "fail",
            options: { with: {} },
            handler: async ({ with: thrown }) => {
                throw thrown === "error" ? new Error("Server is not running") : thrown
            },
        })
        await CLI.run(failing, { argv: ["--with", "error"] })
        expect(stderr).toHaveBeenLastCalledWith("Server is not running\n")
        await CLI.run(failing, { argv: ["--with", "text"] })
        expect(stderr).toHaveBeenLastCalledWith("text\n")
        expect(process.exitCode).toBe(1)
    })

    it("prints the version when it has one", async () => {
        await CLI.run(program, { argv: ["--version"], version: "1.2.0" })
        expect(stdout).toHaveBeenCalledWith("1.2.0\n")
        expect(process.exitCode).toBe(0)
        await CLI.run(program, { argv: ["--version"] })
        expect(stderr).toHaveBeenCalledWith("greet\nGreets someone\n\nCommands:\n  hello  Says hello\n")
        expect(process.exitCode).toBe(1)
    })
})
