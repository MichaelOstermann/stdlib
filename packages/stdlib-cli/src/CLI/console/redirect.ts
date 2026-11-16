/**
 * # redirect
 *
 * Sends `console.log`, `console.info` and `console.debug` to stderr, to keep stdout for another
 * program. Commands under `rpc` do this on their own.
 *
 * ## Example
 *
 * ```ts
 * CLI.console.redirect()
 * console.log("Connecting") // on stderr
 * process.stdout.write(JSON.stringify(result))
 * ```
 */
export function redirect(): void {
    Object.assign(console, { debug: console.error, info: console.error, log: console.error })
}
