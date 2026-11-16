import { agent } from "./agent"
import { ci } from "./ci"
import { human } from "./human"

export function color(): boolean {
    const env = process.env
    if (env["NO_COLOR"]) return false
    if (env["FORCE_COLOR"]) return true
    if (agent()) return false
    if (ci()) return false
    if (env["TERM"] === "dumb") return false
    return human()
}
