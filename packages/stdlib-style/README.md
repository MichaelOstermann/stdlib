<div align="center">

<h1>stdlib-style</h1>

**How my code looks: a dprint formatter, an Oxlint config and a TypeScript config.**

</div>

The formatter is a dprint plugin written in Rust (`crates/dprint-plugin` in this repo), shipped as WebAssembly inside this package. Markdown, CSS and HTML use dprint's own plugins. Oxlint only reports what a formatter cannot decide: whatever the formatter applies is not a lint rule, so formatting never shows up as a diagnostic.

## Setup

```sh
bun add -D @monstermann/stdlib-style dprint oxlint oxlint-tsgolint
```

`dprint.json`:

```json
{ "extends": "./node_modules/@monstermann/stdlib-style/dprint.json" }
```

`oxlint.config.ts`:

```ts
import oxlint from "@monstermann/stdlib-style/oxlint";

export default oxlint({ react: true });
```

`tsconfig.json`:

```json
{ "extends": "@monstermann/stdlib-style/tsconfig.json" }
```

`package.json`:

```json
{
    "scripts": {
        "format": "dprint fmt",
        "lint": "oxlint"
    }
}
```

| Option      | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| `react`     | Lints React with `@eslint-react`.                            |
| `tailwind`  | The CSS entry of Tailwind, for linting its classes.          |
| `ignores`   | Globs that are not linted, next to `node_modules`, `dist`, … |
| `overrides` | Oxlint overrides, appended to the ones of the config.        |

To leave a code block in Markdown as it is, put `<!-- dprint-ignore -->` above it. A file starting with `// dprint-ignore-file` is not formatted.

## Editors

Both tools run from the project's `node_modules`, so every project formats and lints with its own version.

### VS Code

Install [dprint](https://marketplace.visualstudio.com/items?itemName=dprint.dprint) and [Oxc](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode), then in `.vscode/settings.json`:

```json
{
    "editor.defaultFormatter": "dprint.dprint",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.oxc": "explicit"
    }
}
```

Saving applies Oxlint's fixes first, then dprint formats. Turn off the ESLint and Prettier extensions for the project if they are installed.

### Zed

Install the extensions [Oxc](https://zed.dev/extensions/oxc) and [Dprint support](https://zed.dev/extensions/dprint) with `zed: extensions`, then in `.zed/settings.json`:

```json
{
    "languages": {
        "TypeScript": {
            "format_on_save": "on",
            "formatter": [
                { "code_action": "source.fixAll.oxc" },
                { "language_server": { "name": "dprint" } }
            ]
        }
    },
    "lsp": {
        "oxlint": {
            "initialization_options": {
                "settings": { "typeAware": true }
            }
        }
    }
}
```

Repeat the `languages` entry for `TSX`, `JavaScript`, `JSON` and `Markdown`. The dprint extension uses `node_modules/.bin/dprint`; the Oxc extension starts `oxlint --lsp` from the project.

### Neovim

`nvim-lspconfig` has both as `oxlint` and `dprint`. Start them only where their config is (`workspace_required = true`), point `dprint` at `node_modules/.bin/dprint`, and set `typeAware = true` for `oxlint`: lspconfig only turns it on for a `.oxlintrc.json`. `LspOxlintFixAll` does not wait for its fixes, call `oxc.fixAll` with `request_sync` before formatting on save.
