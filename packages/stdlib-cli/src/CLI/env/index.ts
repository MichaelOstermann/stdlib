import { agent } from "./agent"
import { ci } from "./ci"
import { color } from "./color"
import { human } from "./human"

export const env = {
    /** Whether an agent runs the program. */
    agent: agent(),
    /** Whether CI runs the program. */
    ci: ci(),
    /** Whether output gets colors. Set it to turn them on or off. */
    color: color(),
    /** Whether a person is at a terminal, who can be asked for what is missing. */
    human: human(),
}
