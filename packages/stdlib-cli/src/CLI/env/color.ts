import { agent } from "./agent"
import { ci } from "./ci"
import { human } from "./human"

/**
 * # color
 *
 * ```ts
 * function CLI.env.color(): boolean
 * ```
 *
 * Whether output gets colors: only for a person at a terminal. `NO_COLOR` turns them off and
 * `FORCE_COLOR` on, before anything else is asked.
 *
 * Agents, CI, pipes and `TERM=dumb` get plain text: escape codes are noise to an agent, and CI logs
 * end up read by one too.
 */
export function color(): boolean {
    const env = process.env
    if (env["NO_COLOR"]) return false
    if (env["FORCE_COLOR"]) return true
    if (agent()) return false
    if (ci()) return false
    if (env["TERM"] === "dumb") return false
    return human()
}
