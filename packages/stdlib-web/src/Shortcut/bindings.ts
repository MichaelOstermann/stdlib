import type { ShortcutBinding } from "."

/**
 * # bindings
 *
 * The bindings of the app, in the order they were added. Nothing listens to the keyboard by itself.
 * The app listens and runs the binding that matches, see `Shortcut.matches`. The app should take
 * the newest matching binding, so a menu that opened wins over the page.
 *
 * A binding is a shortcut and what it runs. Apps add their own fields by declaring
 * `ShortcutBinding` again:
 *
 * ```ts
 * declare module "@monstermann/stdlib-web" {
 *     interface ShortcutBinding {
 *         desc?: string;
 *         whileTyping?: boolean;
 *     }
 * }
 * ```
 *
 * ## Example
 *
 * ```ts
 * const binding = { shortcut: "mod+k", run: openPalette, desc: "Open the command palette" };
 * Shortcut.bindings.add(binding);
 * Shortcut.bindings.delete(binding);
 *
 * // A list of what can be pressed right now:
 * const shortcuts = [...Shortcut.bindings].filter((binding) => binding.desc);
 * ```
 */
export const bindings: Set<ShortcutBinding> = new Set()
