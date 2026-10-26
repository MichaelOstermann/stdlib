import { isAgent } from "./isAgent"
import { isCI } from "./isCI"
import { isInteractive } from "./isInteractive"

/**
 * # shouldColor
 *
 * ```ts
 * function CLI.shouldColor(): boolean
 * ```
 *
 * Whether output gets colors: only for a person at a terminal. `NO_COLOR` turns them off and
 * `FORCE_COLOR` on, before anything else is asked.
 *
 * Agents, CI, pipes and `TERM=dumb` get plain text: escape codes are noise to an agent, and CI logs
 * end up read by one too.
 */
export function shouldColor(): boolean {
    const env = process.env
    if (env["NO_COLOR"]) return false
    if (env["FORCE_COLOR"]) return true
    if (isAgent()) return false
    if (isCI()) return false
    if (env["TERM"] === "dumb") return false
    return isInteractive()
}
