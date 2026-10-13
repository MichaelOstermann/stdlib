import "./declarations"

/**
 * Makes the types of everything that is available on globals known: `Array.removeAll`, `Math.clamp`, …
 *
 * `@monstermann/stdlib-transform` replaces those with direct imports and removes the import of this file.
 * Without the plugin none of it exists at runtime, so this file throws,
 * unless `@monstermann/stdlib/patch` has been imported to make it available for real.
 */
if (!(Symbol.for("@monstermann/stdlib/patch") in globalThis)) {
    throw new Error("@monstermann/stdlib: @monstermann/stdlib-transform did not run, and @monstermann/stdlib/patch has not been imported.")
}
