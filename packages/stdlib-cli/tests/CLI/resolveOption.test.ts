import { Err, Ok } from "@monstermann/stdlib"
import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

const options = {
    email: CLI.string(),
    firstName: CLI.string().optional(true),
    notify: CLI.boolean(),
    role: CLI.enum().options({ admin: "Everything", member: "Everything but billing" }).default("member"),
    seats: CLI.string().default("1").parse((value) => {
        const seats = Number(value)
        if (!Number.isInteger(seats)) return Err("Must be a whole number")
        return Ok(seats)
    }),
}

function flags(line: string): ReturnType<typeof CLI.resolveArgv>["flags"] {
    return CLI.resolveArgv(line ? line.split(" ") : []).flags
}

describe("CLI.resolveOption", () => {
    it("should read a kebab-case flag into a camelCase option", async () => {
        expect(await CLI.resolveOption("firstName", options.firstName, flags("--first-name Jane"))).toEqual(Ok("Jane"))
        expect(await CLI.resolveOption("firstName", options.firstName, flags(""))).toEqual(Ok(undefined))
    })

    it("should give the problem as the message", async () => {
        expect<unknown>(await CLI.resolveOption("email", options.email, flags(""))).toEqual(Err({ message: "Required", name: "CLIMissingOptionError", option: "email" }))
        expect<unknown>(await CLI.resolveOption("email", options.email, flags("--email"))).toEqual(Err({ message: "Needs a value", name: "CLIInvalidOptionError", option: "email" }))
        expect<unknown>(await CLI.resolveOption("seats", options.seats, flags("--seats x"))).toEqual(Err({ message: "Must be a whole number", name: "CLIInvalidOptionError", option: "seats" }))
        expect<unknown>(await CLI.resolveOption("role", options.role, flags("--role admn"))).toEqual(Err({ message: "Must be one of: admin, member", name: "CLIInvalidOptionError", option: "role" }))
        expect<unknown>(await CLI.resolveOption("seats", options.seats, flags("--seats 1 --seats=2"))).toEqual(Err({ message: "Options can only be used once", name: "CLIInvalidOptionError", option: "seats" }))
    })

    it("should read booleans", async () => {
        const notify = (line: string): ReturnType<typeof CLI.resolveOption<typeof options.notify>> => CLI.resolveOption("notify", options.notify, flags(line))
        expect(await notify("")).toEqual(Ok(false))
        expect(await notify("--notify")).toEqual(Ok(true))
        expect(await notify("--notify=false")).toEqual(Ok(false))
        expect<unknown>(await notify("--notify=maybe")).toEqual(Err({ message: "Must be true or false", name: "CLIInvalidOptionError", option: "notify" }))
    })

    it("should parse with a Standard Schema", async () => {
        const port = CLI.string().parse({
            "~standard": {
                vendor: "test",
                version: 1,
                validate: (value: unknown) => /^\d+$/.test(String(value)) ? { value: Number(value) } : { issues: [{ message: "Not a port" }] },
            },
        })
        expect(await CLI.resolveOption("port", port, flags("--port 80"))).toEqual(Ok(80))
        expect<unknown>(await CLI.resolveOption("port", port, flags("--port x"))).toEqual(Err({ message: "Not a port", name: "CLIInvalidOptionError", option: "port" }))
    })
})
