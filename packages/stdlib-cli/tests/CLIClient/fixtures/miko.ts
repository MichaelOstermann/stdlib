import { Err, Ok } from "@monstermann/stdlib"
import { CLI } from "../../../src"

const add = CLI
    .command()
    .options({ email: CLI.string(), notify: CLI.boolean() })
    .action(async ({ email, notify }) => {
        if (email === "taken@miko.dev") return Err("This email is already a member")
        if (email === "slow@miko.dev") await Bun.sleep(50)
        return Ok({ email, notify })
    })

export const program = CLI.command().commands({ members: CLI.command().commands({ add }) })

if (import.meta.main) await CLI.run(program, { name: "miko", rpc: CLI.command().commands(program.config.commands) })
