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

async function errors(line: string): Promise<unknown> {
    const resolved = await CLI.resolve.options(options, flags(line))
    if (resolved.ok) return undefined
    return resolved.value.errors
}

describe("CLI.resolve.options", () => {
    it("should fill in defaults and leave optional options undefined", async () => {
        expect<unknown>(await CLI.resolve.options(options, flags("--email a@b.c"))).toEqual(Ok({ email: "a@b.c", firstName: undefined, notify: false, role: "member", seats: 1 }))
    })

    it("should report every problem, in the order of the options, unknown ones last", async () => {
        expect(await errors("--nope --seats x --role y z")).toEqual([
            { message: "Required", meta: { option: "email" }, name: "CLIMissingOptionError" },
            { message: "Must be one of: admin, member", meta: { option: "role" }, name: "CLIInvalidOptionError" },
            { message: "Must be a whole number", meta: { option: "seats" }, name: "CLIInvalidOptionError" },
            { message: "Unknown option", meta: { option: "--nope" }, name: "CLIUnknownOptionError" },
            { message: "Unknown option", meta: { option: "z" }, name: "CLIUnknownOptionError" },
        ])
    })
})
