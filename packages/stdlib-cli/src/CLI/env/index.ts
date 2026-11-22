import { agent } from "./agent"
import { ci } from "./ci"
import { color } from "./color"
import { human } from "./human"

export const env = {
    /** Whether an agent runs the program. */
    agent: agent(),
    /** Whether CI runs the program. */
    ci: ci(),
    /** Whether output has colors. Set `color` to turn colors on or off. */
    color: color(),
    /** Whether a person sits at a terminal. Only a person can be asked for missing values. */
    human: human(),
}
