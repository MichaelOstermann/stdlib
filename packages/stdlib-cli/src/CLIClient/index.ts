import type { InferClient } from "./types"
import { connect } from "./connect"

export type { CLIClientTransport } from "./connect"

/** The commands of `X` that have an action, each as a function that calls it. */
export type CLIClient<X> = InferClient<X>

export const CLIClient = { connect }
