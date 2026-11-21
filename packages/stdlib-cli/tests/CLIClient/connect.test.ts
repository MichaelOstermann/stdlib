import type { program } from "./fixtures/miko"
import { Err, Ok } from "@monstermann/stdlib"
import { afterAll, describe, expect, it } from "bun:test"
import { CLIClient } from "../../src/client"

const child = Bun.spawn(["bun", `${import.meta.dir}/fixtures/miko.ts`, "rpc"], { stdin: "pipe", stdout: "pipe" })

const miko = CLIClient.connect<typeof program>({
    request: (text) => {
        child.stdin.write(text)
        child.stdin.flush()
    },
    response: async (callback) => {
        for await (const text of child.stdout.pipeThrough(new TextDecoderStream())) callback(text)
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

    it("should read responses that arrive in pieces of any size", async () => {
        let respond = (_text: string): void => {}
        const client = CLIClient.connect<typeof program>({
            request: () => {},
            response: (callback) => {
                respond = callback
            },
        })
        const first = client.members.add({ email: "a@b.c" })
        const second = client.members.add({ email: "d@e.f" })
        const third = client.members.add({ email: "g@h.i" })
        respond(`{"id":0,"ok":true,`)
        respond(`"value":0}\n{"id":1,"ok":true,"value":1}\n{"id":2,`)
        respond(`"ok":false,"value":2}\n`)
        expect(await Promise.all([first, second, third])).toEqual([Ok(0), Ok(1), Err(2)] as never)
    })
})
