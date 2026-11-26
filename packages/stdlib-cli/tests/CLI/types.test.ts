import { Err, Ok } from "@monstermann/stdlib"
import { describe, expectTypeOf, it } from "bun:test"
import { CLI } from "../../src"

type TakenError = { email: string, message: string, name: "TakenError" }

const add = CLI
    .command()
    .options({
        email: CLI.string(),
        firstName: CLI.string().optional(true),
        notify: CLI.boolean(),
        role: CLI.enum().options({ admin: "", member: "" }).default("member"),
        seats: CLI.string().default("1").parse((value) => Ok(Number(value))),
        team: CLI.enum().options({ a: "", b: "" }),
    })
    .action(({ email }) => {
        if (email === "taken@miko.dev") return Err<TakenError>({ email, message: "Already a member", name: "TakenError" })
        return Ok(email)
    })

describe("InferOptions", () => {
    it("should be the values the action gets", () => {
        expectTypeOf<CLI.InferOptions<typeof add>>().toEqualTypeOf<{
            email: string
            firstName: string | undefined
            notify: boolean
            role: "admin" | "member"
            seats: number
            team: "a" | "b"
        }>()
    })
})
