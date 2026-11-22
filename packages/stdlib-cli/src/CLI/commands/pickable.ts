import type { AnyCommand, ResolvedCommand } from "../types"

/**
 * # pickable
 *
 * Returns every command below `resolved` that has an action. When `filter` returns `false` for a
 * command, that command and everything below it are left out.
 *
 * ## Example
 *
 * ```ts
 * const commands = CLI.commands.pickable(CLI.commands.nearest(miko, []), (command) => command !== rpc)
 * ```
 */
export function pickable(resolved: ResolvedCommand, filter: (command: AnyCommand) => boolean = () => true): ResolvedCommand[] {
    const { command, parents, path } = resolved
    return Object.entries(command.config.commands).filter(([, child]) => filter(child)).flatMap(([name, child]) => {
        const entry = { command: child, parents: [...parents, command], path: [...path, name] }
        const own = child.config.action ? [entry] : []
        return [...own, ...pickable(entry, filter)]
    })
}
