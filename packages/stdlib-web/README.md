# @monstermann/stdlib-web

Utilities for the web platform, next to [`@monstermann/stdlib`](https://github.com/MichaelOstermann/stdlib#readme).

Unlike `@monstermann/stdlib`, nothing in here is a global: it is imported, and needs no plugin.

```sh
bun add @monstermann/stdlib-web
```

## Rect

Rectangles by their position and size, and everything to measure, move, resize and compare them. Every function takes anything of that shape, a `DOMRect` included, and returns what it was given when nothing changed.

```ts
import { Rect } from "@monstermann/stdlib-web";

const anchor = Rect.fromElement(button);
const tooltip = Rect.placeBelowBy({ left: 0, top: 0, width: 200, height: 40 }, anchor, 8);

Rect.intersects(tooltip, Rect.fromWindow()); // true
```
