import { onTerminalCleanup } from "../internals/terminalCleanup"

const ENTER_ALTERNATE_SCREEN = "\x1b[?1049h\x1b[H"
const LEAVE_ALTERNATE_SCREEN = "\x1b[?1049l"

/**
 * # alternateScreen
 *
 * Switches to a separate, empty screen, like `less` or `vim` do. Returns a function that switches
 * back, which shows the terminal as it was before. Switches back on its own when the process exits
 * or gets SIGINT or SIGTERM.
 *
 * ## Example
 *
 * ```ts
 * const leave = CLI.alternateScreen();
 * const stop = CLI.render(({ height }) => lines.slice(-height));
 * // Later:
 * stop();
 * leave();
 * ```
 */
export function alternateScreen(): () => void {
    process.stdout.write(ENTER_ALTERNATE_SCREEN)
    return onTerminalCleanup(() => process.stdout.write(LEAVE_ALTERNATE_SCREEN))
}
