import { colors } from "./colors"

export function format(result: Result<JSONValue, JSONValue>): string {
    if (result.value === null) return ""
    if (!result.ok) return colors.red(text(result.value))
    return text(result.value)
}

function text(value: JSONValue): string {
    if (typeof value === "string") return value
    return Bun.inspect(value, { colors: false })
}
