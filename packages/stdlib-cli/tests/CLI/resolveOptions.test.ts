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

async function errors(line: string): Promise<unknown> {
    const resolved = await CLI.resolveOptions(options, flags(line))
    if (resolved.ok) return undefined
    return resolved.value.errors
}

describe("CLI.resolveOptions", () => {
    it("should fill in defaults and leave optional options undefined", async () => {
        expect<unknown>(await CLI.resolveOptions(options, flags("--email a@b.c"))).toEqual(Ok({ email: "a@b.c", firstName: undefined, notify: false, role: "member", seats: 1 }))
    })

    it("should report every problem, in the order of the options, unknown ones last", async () => {
        expect(await errors("--nope --seats x --role y z")).toEqual([
            { message: "Required", name: "CLIMissingOptionError", option: "email" },
            { message: "Must be one of: admin, member", name: "CLIInvalidOptionError", option: "role" },
            { message: "Must be a whole number", name: "CLIInvalidOptionError", option: "seats" },
            { message: "Unknown option", name: "CLIUnknownOptionError", option: "--nope" },
            { message: "Unknown option", name: "CLIUnknownOptionError", option: "z" },
        ])
    })
})
