import type { program } from "./fixtures/miko"
import { afterAll, describe, expect, it } from "bun:test"
import { CLIClient } from "../../src/client"

const child = Bun.spawn(["bun", `${import.meta.dir}/fixtures/miko.ts`, "rpc"], { stdin: "pipe", stdout: "pipe" })

const miko = CLIClient.connect<typeof program>({
    onLine: async (callback) => {
        let rest = ""
        for await (const chunk of child.stdout.pipeThrough(new TextDecoderStream())) {
            const lines = (rest + chunk).split("\n")
            rest = lines.pop()!
            lines.forEach(callback)
        }
    },
    send: (line) => {
        child.stdin.write(line)
        child.stdin.flush()
    },
})

afterAll(() => child.kill())

describe("CLIClient.connect", () => {
    it("should give what the action returns", async () => {
        expect(await miko.members.add({ email: "a@b.c", notify: true })).toEqual(Ok({ email: "a@b.c", notify: true }))
        expect(await miko.members.add({ email: "a@b.c" })).toEqual(Ok({ email: "a@b.c", notify: false }))
    })

    it("should give what went wrong", async () => {
        expect(await miko.members.add({ email: "taken@miko.dev" })).toEqual(Err({ message: "This email is already a member", name: "Error" }))
        expect(await (miko.members.add as (options: object) => Promise<unknown>)({ emial: "a@b.c" })).toMatchObject(Err({ name: "CLIOptionsError" }))
    })

    it("should pass values that look like flags as they are", async () => {
        expect(await miko.members.add({ email: "--help" })).toEqual(Ok({ email: "--help", notify: false }))
    })

    it("should answer each call, whichever finishes first", async () => {
        const slow = miko.members.add({ email: "slow@miko.dev" })
        const fast = miko.members.add({ email: "fast@miko.dev" })
        expect(await Promise.all([slow, fast])).toEqual([Ok({ email: "slow@miko.dev", notify: false }), Ok({ email: "fast@miko.dev", notify: false })])
    })
})
