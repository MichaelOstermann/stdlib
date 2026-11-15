import { describe, expect, it } from "bun:test"
import { CLI } from "../../../src"

const add = CLI
    .command()
    .options({
        email: CLI.string(),
        firstName: CLI.string().optional(true),
        notify: CLI.boolean(),
        role: CLI.enum().options({ admin: "Everything", member: "Everything but billing" }).default("member"),
        seats: CLI.string().default("1").parse((value) => {
            const seats = Number(value)
            if (!Number.isInteger(seats)) return Err("Must be a whole number")
            return Ok(seats)
        }),
    })
    .action(() => {})

function resolve(line: string): ReturnType<typeof CLI.options.resolve<typeof add>> {
    return CLI.options.resolve({ argv: line ? line.split(" ") : [], command: add })
}

describe("CLI.options.resolve", () => {
    it("should read values after the flag and after =", async () => {
        expect((await resolve("--email a@b.c")).options?.email).toBe("a@b.c")
        expect((await resolve("--email=a@b.c")).options?.email).toBe("a@b.c")
        expect((await resolve("--email --x=y")).error?.errors).toContainEqual({ message: "Missing a value for --email", meta: { option: "email" }, name: "CLIMissingValueError" })
    })

    it("should fill in defaults and leave optional options undefined", async () => {
        expect((await resolve("--email a@b.c")).options).toEqual({
            email: "a@b.c",
            firstName: undefined,
            notify: false,
            role: "member",
            seats: 1,
        })
    })

    it("should take the last value when a flag is given twice", async () => {
        expect((await resolve("--email a@b.c --email c@d.e")).options?.email).toBe("c@d.e")
    })

    it("should read kebab-case flags into camelCase options", async () => {
        expect((await resolve("--email a@b.c --first-name Jane")).options?.firstName).toBe("Jane")
    })

    it("should read booleans without taking the next word", async () => {
        expect((await resolve("--email a@b.c --notify")).options?.notify).toBe(true)
        expect((await resolve("--email a@b.c --notify --no-notify")).options?.notify).toBe(false)
        expect((await resolve("--email a@b.c --notify=true")).options?.notify).toBe(true)
        expect((await resolve("--email a@b.c --notify=false")).options?.notify).toBe(false)
        expect((await resolve("--notify --email a@b.c")).options?.email).toBe("a@b.c")
        expect((await resolve("--email a@b.c --notify yes")).error?.errors).toEqual([{ message: "Unknown option yes", meta: { input: "yes", suggestions: [] }, name: "CLIUnknownOptionError" }])
    })

    it("should reject booleans that are not true or false", async () => {
        expect((await resolve("--email a@b.c --notify=yes")).error?.errors).toEqual([
            { message: "Invalid option --notify: Must be true or false", meta: { option: "notify" }, name: "CLIInvalidOptionError" },
        ])
    })

    it("should reject values that are not one of them, with suggestions", async () => {
        expect((await resolve("--email a@b.c --role admn")).error?.errors).toEqual([
            { message: "Invalid option --role: Must be one of: admin, member, did you mean: admin?", meta: { option: "role" }, name: "CLIInvalidOptionError" },
        ])
    })

    it("should reject what parse rejects", async () => {
        expect((await resolve("--email a@b.c --seats x")).error?.errors).toEqual([
            { message: "Invalid option --seats: Must be a whole number", meta: { option: "seats" }, name: "CLIInvalidOptionError" },
        ])
    })

    it("should parse with a Standard Schema", async () => {
        const command = CLI.command().options({
            port: CLI.string().parse({
                "~standard": {
                    vendor: "test",
                    version: 1,
                    validate: (value: unknown) => /^\d+$/.test(String(value)) ? { value: Number(value) } : { issues: [{ message: "Not a port" }] },
                },
            }),
        })
        expect((await CLI.options.resolve({ argv: ["--port", "80"], command })).options?.port).toBe(80)
        expect((await CLI.options.resolve({ argv: ["--port", "x"], command })).error?.errors).toEqual([
            { message: "Invalid option --port: Not a port", meta: { option: "port" }, name: "CLIInvalidOptionError" },
        ])
    })

    it("should report missing options and values", async () => {
        expect((await resolve("")).error?.errors).toEqual([{ message: "Missing option --email", meta: { option: "email" }, name: "CLIMissingOptionError" }])
        expect((await resolve("--email")).error?.errors).toEqual([{ message: "Missing a value for --email", meta: { option: "email" }, name: "CLIMissingValueError" }])
    })

    it("should read = without anything after it as an empty value", async () => {
        expect((await resolve("--email=")).options?.email).toBe("")
        expect((await resolve("--email=a@b.c --first-name=")).options?.firstName).toBe("")
    })

    it("should report unknown flags, which take the next word unless it is a flag", async () => {
        expect((await resolve("--email a@b.c --nope x")).error?.errors).toEqual([{ message: "Unknown option --nope", meta: { input: "--nope", suggestions: [] }, name: "CLIUnknownOptionError" }])
        expect((await resolve("--email a@b.c --nope=x y")).error?.errors).toEqual([
            { message: "Unknown option --nope", meta: { input: "--nope", suggestions: [] }, name: "CLIUnknownOptionError" },
            { message: "Unknown option y", meta: { input: "y", suggestions: [] }, name: "CLIUnknownOptionError" },
        ])
        expect((await resolve("--nope --email a@b.c")).error?.errors).toEqual([{ message: "Unknown option --nope", meta: { input: "--nope", suggestions: [] }, name: "CLIUnknownOptionError" }])
    })

    it("should report every problem, in the order of the options, unknown ones last", async () => {
        expect((await resolve("--nope --seats x --role y")).error?.errors).toEqual([
            { message: "Missing option --email", meta: { option: "email" }, name: "CLIMissingOptionError" },
            { message: "Invalid option --role: Must be one of: admin, member", meta: { option: "role" }, name: "CLIInvalidOptionError" },
            { message: "Invalid option --seats: Must be a whole number", meta: { option: "seats" }, name: "CLIInvalidOptionError" },
            { message: "Unknown option --nope", meta: { input: "--nope", suggestions: [] }, name: "CLIUnknownOptionError" },
        ])
    })

    it("should report unknown words before asking anything", async () => {
        const resolved = await CLI.options.resolve({ argv: ["--nope"], command: add, prompt: true })
        expect(resolved.error?.errors).toEqual([
            { message: "Missing option --email", meta: { option: "email" }, name: "CLIMissingOptionError" },
            { message: "Unknown option --nope", meta: { input: "--nope", suggestions: [] }, name: "CLIUnknownOptionError" },
        ])
    })

    it("should show the problems and the options they are about", async () => {
        const resolved = await resolve("--emial a@b.c")
        expect(Bun.stripANSI(resolved.message!)).toBe([
            "Missing option --email",
            "Unknown option --emial, did you mean: --email?",
            "",
            "Options:",
            "  --email",
        ].join("\n"))
    })
})
