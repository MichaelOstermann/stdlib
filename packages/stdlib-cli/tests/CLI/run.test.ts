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

    it("prints help to stdout", async () => {
        await CLI.run(program, { argv: [] })
        expect(stdout).toHaveBeenCalledWith("Greets someone\n\nCommands:\n  hello  Says hello\n")
        expect(process.exitCode).toBe(0)
    })

    it("prints errors to stderr and exits with 1", async () => {
        await CLI.run(program, { argv: ["hello"] })
        expect(stderr).toHaveBeenCalledWith("Missing flag: --name\n\nOptions:\n  --name  Who to greet\n")
        expect(ran).toBeUndefined()
        expect(process.exitCode).toBe(1)
    })
})
