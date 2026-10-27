import type { Outcome } from "../../src/CLI"
import { describe, expect, it } from "bun:test"
import { CLI } from "../../src/CLI"

const add = CLI.command({
    desc: "Add a member",
    name: "add",
    handler() {},
    options: {
        firstName: { desc: "First name" },
        lastName: { desc: "Last name", optional: true },
        legacy: { enabled: false, optional: true },
        secret: { hidden: true, optional: true },
        port: {
            default: "3000",
            parse: (value) => {
                if (!/^\d+$/.test(value)) throw new Error(`Not a whole number: ${value}`)
                return Number(value)
            },
        },
    },
})

const commands = [
    CLI.command({
        name: "members",
        commands: [
            add,
            CLI.command({ name: "remove", handler() {} }),
            CLI.command({ name: "rekked", handler() {} }),
            CLI.command({ hidden: true, name: "purge", handler() {} }),
            CLI.command({ enabled: false, name: "legacy", handler() {} }),
        ],
    }),
]

function resolve(line: string, interactive = true): Promise<Outcome> {
    return CLI.resolve(commands, line ? line.split(" ") : [], { interactive })
}

function errors(outcome: Outcome): unknown[] {
    return outcome.type === "error" ? outcome.errors : []
}

describe("resolve", () => {
    describe("commands", () => {
        it("runs a command with its values", async () => {
            const outcome = await resolve("members add --first-name John")
            expect(outcome.type).toBe("run")
            expect(outcome.path).toEqual(["members", "add"])
            expect(outcome.type === "run" && outcome.values).toEqual({ firstName: "John", lastName: undefined, port: 3000 })
        })

        it("shows the help of a command without a handler", async () => {
            expect((await resolve("members")).type).toBe("help")
            expect((await resolve("")).type).toBe("help")
        })

        it("abbreviates when interactive", async () => {
            const outcome = await resolve("mem a --fn John")
            expect(outcome.type).toBe("run")
            expect(outcome.path).toEqual(["members", "add"])
        })

        it("needs exact names when not interactive", async () => {
            expect(errors(await resolve("mem add --first-name John", false))).toEqual([{ type: "UnknownCommand", value: "mem" }])
        })

        it("reports an ambiguous command with its candidates", async () => {
            const [error] = errors(await resolve("members re"))
            expect(error).toMatchObject({ type: "AmbiguousCommand", value: "re" })
            expect((error as { candidates: { name: string }[] }).candidates.map((command) => command.name).sort()).toEqual(["rekked", "remove"])
        })

        it("only runs a hidden command by its exact name", async () => {
            expect(errors(await resolve("members pur"))).toEqual([{ type: "UnknownCommand", value: "pur" }])
            expect((await resolve("members purge")).type).toBe("run")
        })

        it("does not know a disabled command", async () => {
            expect(errors(await resolve("members legacy"))).toEqual([{ type: "UnknownCommand", value: "legacy" }])
        })

        it("does not treat a lone dash as a command", async () => {
            expect(errors(await resolve("members - --fn John"))).toEqual([{ type: "UnknownCommand", value: "-" }])
        })
    })

    describe("flag names", () => {
        it("ignores casing and dashes", async () => {
            for (const flag of ["--firstName", "--first-name", "--first_name", "-FIRST_NAME", "--firstname"]) {
                const outcome = await resolve(`members add ${flag} John`, false)
                expect(outcome.type === "run" && outcome.values["firstName"]).toBe("John")
            }
        })

        it("reports an ambiguous flag with its candidates", async () => {
            const [error] = errors(await resolve("members add --name John"))
            expect(error).toMatchObject({ type: "AmbiguousFlag", value: "--name" })
            expect((error as { candidates: string[] }).candidates.sort()).toEqual(["firstName", "lastName"])
        })

        it("reports every unknown flag, and nothing else", async () => {
            expect(errors(await resolve("members add --frist John --xyz"))).toEqual([
                { type: "UnknownFlag", value: "--frist" },
                { type: "UnknownFlag", value: "--xyz" },
            ])
        })

        it("does not treat -- as a flag name", async () => {
            expect(errors(await resolve("members add --fn John -- --ln Doe"))).toEqual([{ type: "UnknownFlag", value: "--" }])
        })

        it("only matches a hidden flag by its exact name", async () => {
            expect(errors(await resolve("members add --fn John --sec s"))).toEqual([{ type: "UnknownFlag", value: "--sec" }])
            const outcome = await resolve("members add --fn John --secret s")
            expect(outcome.type === "run" && outcome.values["secret"]).toBe("s")
        })

        it("does not know a disabled flag", async () => {
            expect(errors(await resolve("members add --fn John --legacy x"))).toEqual([{ type: "UnknownFlag", value: "--legacy" }])
        })
    })

    describe("values", () => {
        it("takes every word up to the next flag", async () => {
            const outcome = await resolve("members add --fn Mary Ann --ln Doe Smith")
            expect(outcome.type === "run" && outcome.values).toMatchObject({ firstName: "Mary Ann", lastName: "Doe Smith" })
        })

        it("takes a lone dash as a value", async () => {
            const outcome = await resolve("members add --fn -")
            expect(outcome.type === "run" && outcome.values["firstName"]).toBe("-")
        })

        it("takes the value after = as a word", async () => {
            const outcome = await resolve("members add --first-name=Mary Ann --port=-1", false)
            expect(errors(outcome)).toEqual([{ message: "Not a whole number: -1", name: "port", type: "InvalidFlag" }])
            const outcome2 = await resolve("members add --fn=Mary Ann --ln=")
            expect(outcome2.type === "run" && outcome2.values).toMatchObject({ firstName: "Mary Ann", lastName: "" })
        })

        it("parses the default like a given value", async () => {
            const outcome = await resolve("members add --fn John --port 8080")
            expect(outcome.type === "run" && outcome.values["port"]).toBe(8080)
        })

        it("reports what is invalid, missing and unexpected together", async () => {
            expect(errors(await resolve("members add extra --port abc"))).toEqual([
                { name: "firstName", type: "MissingFlag" },
                { message: "Not a whole number: abc", name: "port", type: "InvalidFlag" },
                { type: "UnexpectedArgument", value: "extra" },
            ])
        })

        it("reports a flag without a value", async () => {
            expect(errors(await resolve("members add --fn --ln Doe"))).toEqual([
                { message: "Requires a value", name: "firstName", type: "InvalidFlag" },
            ])
        })

        it("leaves a repeated flag over", async () => {
            expect(errors(await resolve("members add --fn John --fn Jane"))).toEqual([
                { type: "UnexpectedArgument", value: "--fn" },
                { type: "UnexpectedArgument", value: "Jane" },
            ])
        })

        it("awaits an async parse", async () => {
            const command = CLI.command({ name: "wait", options: { delay: { parse: async (value) => Number(value) } }, handler() {} })
            const outcome = await CLI.resolve([command], ["wait", "--delay", "5"], { interactive: false })
            expect(outcome.type === "run" && outcome.values["delay"]).toBe(5)
        })
    })
})
