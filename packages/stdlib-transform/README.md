# @monstermann/stdlib-transform

The build plugin of [`@monstermann/stdlib`](https://github.com/MichaelOstermann/stdlib#readme). It replaces what you use of globals with direct imports, compiles `match` into conditionals, and `pipe` into the calls it makes.

```sh
bun add -D @monstermann/stdlib-transform
```

## Vite, Rolldown, tsdown

```ts
import { stdlib } from "@monstermann/stdlib-transform";

export default defineConfig({
    plugins: [stdlib({ enforce: "pre" })],
});
```

| Option    | Default                 | Description                                                            |
| --------- | ----------------------- | ---------------------------------------------------------------------- |
| `include` | `.js`, `.ts`, `.jsx`, … | RegExp(s), only files whose path matches are transformed.              |
| `exclude` |                         | RegExp(s), files whose path matches are skipped.                       |
| `enforce` |                         | `"pre"` or `"post"`.                                                   |
| `debug`   | `false`                 | `true` or a RegExp matching file paths, prints what is being replaced. |
| `hmr`     | Vite dev server         | Disposes effects and emitters when their module is replaced.           |
| `react`   | if it is installed      | Wraps reads of signals in components and hooks with `useSignal`.       |

Dependencies are always skipped: what a dependency uses of `Array` or `Object` is its own.

## Bun

```ts
import { stdlibBun } from "@monstermann/stdlib-transform";

await Bun.build({
    entrypoints: ["./src/index.ts"],
    plugins: [stdlibBun()],
});
```

A preload makes `bun test` and `bun run` go through the plugin as well:

```ts [preload.ts]
import { plugin } from "bun";
import { stdlibBun } from "@monstermann/stdlib-transform";

plugin(stdlibBun());
```

```toml [bunfig.toml]
preload = ["./preload.ts"]

[test]
preload = ["./preload.ts"]
```

Bun only uses the first plugin that loads a file. When there are others, call `transform(code, path)` from your own.
