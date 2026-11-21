import { replica } from "../internals/replica"
import { camelCase } from "./camelCase"
import { capitalize } from "./capitalize"
import { constantCase } from "./constantCase"
import { dedent } from "./dedent"
import { distance } from "./distance"
import { escapeHTML } from "./escapeHTML"
import { graphemes } from "./graphemes"
import { kebabCase } from "./kebabCase"
import { links } from "./links"
import { pascalCase } from "./pascalCase"
import { score } from "./score"
import { sentenceCase } from "./sentenceCase"
import { slug } from "./slug"
import { snakeCase } from "./snakeCase"
import { titleCase } from "./titleCase"
import { uncapitalize } from "./uncapitalize"
import { words } from "./words"

/**
 * The native `String`, with the functions of `@monstermann/stdlib` added: `String.camelCase`, …
 *
 * `String(value)` and the native members behave as they always do.
 */
export const String = replica(globalThis.String, {
    camelCase,
    capitalize,
    constantCase,
    dedent,
    distance,
    escapeHTML,
    graphemes,
    kebabCase,
    links,
    pascalCase,
    score,
    sentenceCase,
    slug,
    snakeCase,
    titleCase,
    uncapitalize,
    words,
})
