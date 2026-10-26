import type { ShortcutBinding } from "."

/**
 * # bindings
 *
 * ```ts
 * const Shortcut.bindings: Set<ShortcutBinding>
 * ```
 *
 * The bindings of the app, in the order they were added. Nothing listens to the keyboard on its
 * own: the app does, and runs what matches, see `Shortcut.matches`. Taking the newest binding that
 * matches lets the one of a menu that opened win over the one of the page.
 *
 * A binding is a shortcut and what it runs. What else an app needs goes into `ShortcutBinding`,
 * which it declares again:
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
