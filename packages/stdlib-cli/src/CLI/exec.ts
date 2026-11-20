import type { ResolvedArgv } from "./resolve/argv"
import type { AnyCommand, CLIError, CLIInternalError, ResolvedCommand } from "./types"
import { commands } from "./commands"
import { redirect } from "./console/redirect"
import { env } from "./env"
import { prompt } from "./prompt"
import { resolve } from "./resolve"

/** What `CLI.exec` did. */
export type Execution = {
    argv: ResolvedArgv
    command: ResolvedCommand | undefined
    isHelp: boolean
    isRPC: boolean
    /** What people type to run the program. */
    name: string
    options: Record<string, unknown> | undefined
    program: AnyCommand
    result: Result<JSONValue, CLIError | Failure>
}

/**
 * # exec
 *
 * Does what `CLI.run` does without printing, and returns what happened.
 *
 * ## Example
 *
 * ```ts
 * const execution = await CLI.exec(miko, { name: "miko", rpc })
 * if (!execution.result.ok) process.stderr.write(`${CLI.format.exec(execution)}\n`)
 * ```
 */
export async function exec(root: AnyCommand, input: { argv?: ResolvedArgv, name: string, prompt?: false, rpc?: AnyCommand }): Promise<Execution> {
    const { rpc } = input
    const argv = input.argv ?? resolve.argv()
    const program = rpc ? root.commands({ ...root.config.commands, rpc }) : root
    const nearest = commands.nearest(program, argv.path)
    const isRPC = rpc !== undefined && [...nearest.parents, nearest.command].includes(rpc)
    const isPrompting = input.prompt !== false && !isRPC && env.human && !env.agent && !env.ci
    const execution: Execution = { argv, command: undefined, isHelp: argv.isHelp, isRPC, name: input.name, options: undefined, program, result: Ok(null) }

    try {
        const found = resolve.command(program, argv.path)
        if (!found.ok) return { ...execution, result: Err(found.value) }
        if (argv.isHelp) return { ...execution, command: found.value }

        const isPicking = isPrompting && !found.value.command.config.action && !argv.hasFlags
        const choices = isPicking ? commands.pickable(found.value, (command) => command !== rpc) : []
        const command = choices.length ? await prompt.command(choices) : found.value
        const action = command.command.config.action
        if (!action) return { ...execution, command, isHelp: true }

        const values = await resolve.options(command.command.config.options, argv.flags, { prompt: isPrompting })
        if (!values.ok) return { ...execution, command, result: Err(values.value) }

        if (isRPC) redirect()
        const returned = (await action(values.value) ?? Ok(null)) as Result<JSONValue, Failure | Error | string>
        if (!returned.ok) return { ...execution, command, options: values.value, result: Err(Failure.from(returned.value)) }
        return { ...execution, command, options: values.value, result: Ok(returned.value) }
    }
    catch (thrown) {
        return { ...execution, result: Err<CLIInternalError>({ cause: Failure.from(thrown), message: "Internal error", name: "CLIInternalError" }) }
    }
}
