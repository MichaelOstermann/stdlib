import { isAgent } from "../CLI/isAgent"
import { isCI } from "../CLI/isCI"
import { isHuman } from "../CLI/isHuman"

/** Set by `CLI.setColor`. Detected on first use until then. */
export const color: { enabled: boolean | undefined } = { enabled: undefined }

export function detectColor(): boolean {
    const env = process.env
    if (env["NO_COLOR"]) return false
    if (env["FORCE_COLOR"]) return true
    if (isAgent()) return false
    if (isCI()) return false
    if (env["TERM"] === "dumb") return false
    return isHuman()
}
