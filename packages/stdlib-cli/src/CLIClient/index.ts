import type { InferClient } from "./types"
import { connect } from "./connect"

/** Has a function for each command of `X` that has an action. The function calls that command. */
export type CLIClient<X> = InferClient<X>

export namespace CLIClient {
    export interface Transport {
        /** Sends a request to the program. */
        request: (text: string) => void
        /**
         * Calls `callback` with the text the program prints. The text arrives in pieces of any
         * size.
         */
        response: (callback: (text: string) => void) => void
    }
}

export const CLIClient = { connect }
