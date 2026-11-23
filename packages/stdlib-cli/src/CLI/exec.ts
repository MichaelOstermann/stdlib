import type { JSON, Result } from "@monstermann/stdlib"
import type { CLI } from "."
import { Err, Failure, Ok } from "@monstermann/stdlib"
import { isAgent } from "./isAgent"
import { isCI } from "./isCI"
import { isHuman } from "./isHuman"
import { nearestCommand } from "./nearestCommand"
import { pickableCommands } from "./pickableCommands"
import { promptCommand } from "./promptCommand"
import { redirectConsole } from "./redirectConsole"
import { resolveArgv } from "./resolveArgv"
import { resolveCommand } from "./resolveCommand"
import { resolveOptions } from "./resolveOptions"

/**
 * # exec
 *
 * Runs like `CLI.run`, but prints nothing. Returns what happened instead.
 *
 * ## Example
 *
 * ```ts
 * const execution = await CLI.exec(miko, { name: "miko", rpc })
 * if (!execution.result.ok) process.stderr.write(`${CLI.formatExec(execution)}\n`)
 * ```
 */
export async function exec(root: CLI.AnyCommand, input: { argv?: CLI.ResolvedArgv, name: string, prompt?: false, rpc?: CLI.AnyCommand }): Promise<CLI.Execution> {
    const { rpc } = input
    const argv = input.argv ?? resolveArgv()
    const program = rpc ? root.commands({ ...root.config.commands, rpc }) : root
    const nearest = nearestCommand(program, argv.path)
    const isRPC = rpc !== undefined && [...nearest.parents, nearest.command].includes(rpc)
    const isPrompting = input.prompt !== false && !isRPC && isHuman() && !isAgent() && !isCI()
    const execution: CLI.Execution = { argv, command: undefined, isHelp: argv.isHelp, isRPC, name: input.name, options: undefined, program, result: Ok(null) }

    try {
        const found = resolveCommand(program, argv.path)
        if (!found.ok) return { ...execution, result: Err(found.value) }
        if (argv.isHelp) return { ...execution, command: found.value }

        const isPicking = isPrompting && !found.value.command.config.action && !argv.hasFlags
        const choices = isPicking ? pickableCommands(found.value, (command) => command !== rpc) : []
        const command = choices.length ? await promptCommand(choices) : found.value
        const action = command.command.config.action
        if (!action) return { ...execution, command, isHelp: true }

        const values = await resolveOptions(command.command.config.options, argv.flags, { prompt: isPrompting })
        if (!values.ok) return { ...execution, command, result: Err(values.value) }

        if (isRPC) redirectConsole()
        const returned = (await action(values.value) ?? Ok(null)) as Result<JSON, Failure | Error | string>
        if (!returned.ok) return { ...execution, command, options: values.value, result: Err(Failure.from(returned.value)) }
        return { ...execution, command, options: values.value, result: Ok(returned.value) }
    }
    catch (thrown) {
        return { ...execution, result: Err<CLI.InternalError>({ cause: Failure.from(thrown), message: "Internal error", name: "CLIInternalError" }) }
    }
}
