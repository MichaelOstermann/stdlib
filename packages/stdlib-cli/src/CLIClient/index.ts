import type { InferClient } from "./types"
import { connect } from "./connect"

export type { CLIClientTransport } from "./connect"

/** Has a function for each command of `X` that has an action. The function calls that command. */
export type CLIClient<X> = InferClient<X>

export const CLIClient = { connect }
