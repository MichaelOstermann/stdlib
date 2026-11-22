/**
 * # redirect
 *
 * Sends `console.log`, `console.info` and `console.debug` to stderr. This keeps stdout free for
 * another program. Commands under `rpc` already do this.
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
