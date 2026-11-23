import type { CLI } from "."
import { serve } from "../internals/serve"
import { exec } from "./exec"
import { formatExec } from "./formatExec"
import { isHuman } from "./isHuman"

/**
 * # run
 *
 * Runs the command that the command line asks for and prints the result. Errors go to stderr and
 * set the exit code to 1.
 *
 * With `rpc`, `miko rpc …` prints JSON for other programs. `miko rpc` without a command keeps
 * running for `CLIClient.connect`.
 *
 * At a terminal, a person is asked for missing options. When the command has no action, the person
 * picks a command. `prompt: false` turns off both questions.
 *
 * ## Example
 *
 * ```ts
 * await CLI.run(miko, { name: "miko", rpc })
 * ```
 */
export async function run(root: CLI.AnyCommand, input: { argv?: CLI.ResolvedArgv, name: string, prompt?: false, rpc?: CLI.AnyCommand }): Promise<void> {
    const execution = await exec(root, input)
    if (input.rpc && execution.command?.command === input.rpc && !execution.argv.isHelp) return serve(root, { name: input.name, rpc: input.rpc })
    const text = formatExec(execution)
    const isFailure = !execution.result.ok
    if (text && (!isFailure || execution.isRPC)) process.stdout.write(`${text}\n`)
    if (text && isFailure && !execution.isRPC) process.stderr.write(isHuman() ? `\n${text}\n` : `${text}\n`)
    if (isFailure) process.exitCode = 1
}
