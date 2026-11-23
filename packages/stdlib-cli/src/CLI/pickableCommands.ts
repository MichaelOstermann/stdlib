import type { CLI } from "."

/**
 * # pickableCommands
 *
 * Returns every command below `resolved` that has an action. When `filter` returns `false` for a
 * command, that command and everything below it are left out.
 *
 * ## Example
 *
 * ```ts
 * const commands = CLI.pickableCommands(CLI.nearestCommand(miko, []), (command) => command !== rpc)
 * ```
 */
export function pickableCommands(resolved: CLI.ResolvedCommand, filter: (command: CLI.AnyCommand) => boolean = () => true): CLI.ResolvedCommand[] {
    const { command, parents, path } = resolved
    return Object.entries(command.config.commands).filter(([, child]) => filter(child)).flatMap(([name, child]) => {
        const entry = { command: child, parents: [...parents, command], path: [...path, name] }
        const own = child.config.action ? [entry] : []
        return [...own, ...pickableCommands(entry, filter)]
    })
}
