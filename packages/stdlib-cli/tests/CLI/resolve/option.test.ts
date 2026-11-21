import { Err, Ok } from "@monstermann/stdlib"
import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

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

function flags(line: string): ReturnType<typeof CLI.resolve.argv>["flags"] {
    return CLI.resolve.argv(line ? line.split(" ") : []).flags
}

describe("CLI.resolve.option", () => {
    it("should read a kebab-case flag into a camelCase option", async () => {
        expect(await CLI.resolve.option("firstName", options.firstName, flags("--first-name Jane"))).toEqual(Ok("Jane"))
        expect(await CLI.resolve.option("firstName", options.firstName, flags(""))).toEqual(Ok(undefined))
    })

    it("should give the problem as the message", async () => {
        expect<unknown>(await CLI.resolve.option("email", options.email, flags(""))).toEqual(Err({ message: "Required", meta: { option: "email" }, name: "CLIMissingOptionError" }))
        expect<unknown>(await CLI.resolve.option("email", options.email, flags("--email"))).toEqual(Err({ message: "Needs a value", meta: { option: "email" }, name: "CLIInvalidOptionError" }))
        expect<unknown>(await CLI.resolve.option("seats", options.seats, flags("--seats x"))).toEqual(Err({ message: "Must be a whole number", meta: { option: "seats" }, name: "CLIInvalidOptionError" }))
        expect<unknown>(await CLI.resolve.option("role", options.role, flags("--role admn"))).toEqual(Err({ message: "Must be one of: admin, member", meta: { option: "role" }, name: "CLIInvalidOptionError" }))
        expect<unknown>(await CLI.resolve.option("seats", options.seats, flags("--seats 1 --seats=2"))).toEqual(Err({ message: "Options can only be used once", meta: { option: "seats" }, name: "CLIInvalidOptionError" }))
    })

    it("should read booleans", async () => {
        const notify = (line: string): ReturnType<typeof CLI.resolve.option<typeof options.notify>> => CLI.resolve.option("notify", options.notify, flags(line))
        expect(await notify("")).toEqual(Ok(false))
        expect(await notify("--notify")).toEqual(Ok(true))
        expect(await notify("--notify=false")).toEqual(Ok(false))
        expect<unknown>(await notify("--notify=maybe")).toEqual(Err({ message: "Must be true or false", meta: { option: "notify" }, name: "CLIInvalidOptionError" }))
    })

    it("should parse with a Standard Schema", async () => {
        const port = CLI.string().parse({
            "~standard": {
                vendor: "test",
                version: 1,
                validate: (value: unknown) => /^\d+$/.test(String(value)) ? { value: Number(value) } : { issues: [{ message: "Not a port" }] },
            },
        })
        expect(await CLI.resolve.option("port", port, flags("--port 80"))).toEqual(Ok(80))
        expect<unknown>(await CLI.resolve.option("port", port, flags("--port x"))).toEqual(Err({ message: "Not a port", meta: { option: "port" }, name: "CLIInvalidOptionError" }))
    })
})
