import { describe, expect, it } from "bun:test"
import { CLI } from "../../src"

describe("CLI.enum", () => {
    it("should forget the default when the options change", () => {
        const role = CLI.enum().options({ admin: "", member: "" }).default("member")
        expect(role.config.default).toBe("member")
        expect(role.options({ guest: "" }).config.default).toBeUndefined()
    })
})
