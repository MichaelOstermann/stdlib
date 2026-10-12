<div align="center">

<h1>stdlib</h1>

**A utility library for TypeScript.**

</div>

```ts
import "@monstermann/stdlib/globals";

function complete(tasks: Task[], id: string) {
    return Array.mapFirstWhere(
        tasks,
        (task) => task.id === id,
        (task) => Object.merge(task, { done: true }),
    );
}

function label(priority: number) {
    return match(priority)
        .case(1, "urgent")
        .case(2, "soon")
        .unwrapOr("later");
}
```

What ends up in your bundle:

```ts
import { mapFirstWhere as _mapFirstWhere } from "@monstermann/stdlib/Array/mapFirstWhere.mjs";
import { merge as _merge } from "@monstermann/stdlib/Object/merge.mjs";

function complete(tasks: Task[], id: string) {
    return _mapFirstWhere(
        tasks,
        (task) => task.id === id,
        (task) => _merge(task, { done: true }),
    );
}

function label(priority: number) {
    return priority === 1 ? "urgent" : priority === 2 ? "soon" : "later";
}
```

## Principles

- **Only what the language lacks.** There is no `Array.find`, `tasks.find()` is the way.
- **The same value when nothing changed.** `Array.map([1, 2, 3], (i) => i)` is the same array, a copy is only made once the first change is found. That keeps signals from firing and React from rendering for nothing.
- **Copies by default.** The functions for arrays take `{ mut: true }` for when things need to be fast.
- **On the globals they belong to.** Type `Array.` and see what is available, nothing has to be imported. A build plugin replaces what you use with direct imports, so nothing is assigned to a global, and nothing but what you use is bundled.

Everything is documented where it is declared, your editor shows it on hover. [Lessons learned](#lessons-learned) tells why it is built this way.

## What is inside

<!-- overview -->

```ts
Array.chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
Array.filter([1, 2, 3], x => x > 1); // [2, 3]
Array.isShallowEqual([1, 2], [1, 2]); // true
Array.map([1, 2], x => x * 2); // [2, 4]
Array.mapFirstWhere([1, 2, 3], x => x > 1, x => x * 10); // [1, 20, 3]
Array.mapLastWhere([1, 2, 3], x => x > 1, x => x * 10); // [1, 2, 30]
Array.mapWhere([1, 2, 3], x => x > 1, x => x * 10); // [1, 20, 30]
Array.maxBy([{ score: 1 }, { score: 3 }], item => item.score); // { score: 3 }
Array.minBy([{ score: 1 }, { score: 3 }], item => item.score); // { score: 1 }
Array.partition([1, 2, 3, 4], x => x % 2 === 0); // [[2, 4], [1, 3]]
Array.removeAll([1, 2, 3, 2], [2, 3]); // [1]
Array.removeFirst([1, 2, 1], 1); // [2, 1]
Array.removeFirstWhere([1, 2, 3], x => x > 1); // [1, 3]
Array.removeLast([1, 2, 1], 1); // [1, 2]
Array.removeLastWhere([1, 2, 3], x => x > 1); // [1, 2]
Array.removeWhere([1, 2, 3], x => x > 1); // [1]
Array.replaceFirst([1, 2, 1], 1, 3); // [3, 2, 1]
Array.replaceFirstWhere([1, 2, 3], x => x > 1, 0); // [1, 0, 3]
Array.replaceLast([1, 2, 1], 1, 3); // [1, 2, 3]
Array.replaceLastWhere([1, 2, 3], x => x > 1, 0); // [1, 2, 0]
Array.sample([1, 2, 3]); // 2
Array.shuffle([1, 2, 3]); // [2, 3, 1]
Array.sortBy([3, 1, 2], value => value); // [1, 2, 3]
Array.sortByLocale(["b", "ä", "A"], text => text); // ["A", "ä", "b"]
Array.unique([1, 2, 1, 3, 2]); // [1, 2, 3]
Array.uniqueBy(["a", "A", "b"], text => text.toLowerCase()); // ["a", "b"]
```

```ts
Object.defaults({ a: 1, b: undefined }, { b: 2 }); // { a: 1, b: 2 }
Object.indexBy(tasks, task => task.id); // { a: taskA, b: taskB }
Object.isShallowEqual({ a: 1 }, { a: 1 }); // true
Object.merge(task, { title: "New" }); // { ...task, title: "New" }
Object.omit({ a: 1, b: 2, c: 3 }, ["b"]); // { a: 1, c: 3 }
Object.pick({ a: 1, b: 2, c: 3 }, ["a", "c"]); // { a: 1, c: 3 }
Object.set(task, "title", "New"); // { ...task, title: "New" }
```

```ts
Map.delete(new Map([["a", 1], ["b", 2]]), "a"); // Map { "b" => 2 }
Map.isShallowEqual(new Map([["a", 1]]), new Map([["a", 1]])); // true
Map.set(new Map([["a", 1]]), "b", 2); // Map { "a" => 1, "b" => 2 }
```

```ts
Set.add(new Set([1, 2]), 3); // Set { 1, 2, 3 }
Set.delete(new Set([1, 2]), 2); // Set { 1 }
Set.isShallowEqual(new Set([1, 2]), new Set([2, 1])); // true
```

```ts
String.camelCase("hello world"); // "helloWorld"
String.capitalize("hello world"); // "Hello world"
String.constantCase("hello world"); // "HELLO_WORLD"
String.dedent("    a\\n      b"); // "a\\n  b"
String.escapeHTML("<b>Tom & Jerry</b>"); // "&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;"
[...String.graphemes("hello")]; // ["h", "e", "l", "l", "o"]
String.kebabCase("hello world"); // "hello-world"
String.pascalCase("hello world"); // "HelloWorld"
String.score("Settings", "set"); // 0.94
String.slugify("Hello World!"); // "hello-world"
String.snakeCase("hello world"); // "hello_world"
String.titleCase("hello world"); // "Hello World"
String.uncapitalize("Hello World"); // "hello World"
[...String.words("Hello, world!")]; // ["Hello", "world"]
```

```ts
[...Number.range(3)]; // [0, 1, 2]
```

```ts
Math.clamp(10, 0, 5); // 5
Math.mod(7, 5); // 2
```

```ts
JSON.safeStringify({ a: 1 }); // `{"a":1}`
JSON.tryParse(`{"a":1}`); // Ok({ a: 1 })
JSON.tryStringify({ a: 1 }); // Ok(`{"a":1}`)
```

```ts
await Promise.sleep(Duration.SECOND); // A second later.
```

```ts
const save = Function.debounce(write, { wait: 1000 }); // Calls write a second after the last call of save.
const send = Function.middleware(write); // Calls write, with send.use() to get in between.
const onChange = options.onChange ?? Function.noop; // Always the same function.
const config = Function.once(readConfig); // Reads on the first call, returns the same from then on.
const save = Function.throttle(write, { wait: 1000 }); // Calls write once a second at most.
```

```ts
Duration.backoff(0, Duration.SECOND, Duration.MINUTE); // 1_000
7 * Duration.DAY; // 604_800_000
Duration.format(90 * Duration.SECOND); // "1m 30s"
2 * Duration.HOUR; // 7_200_000
Duration.jitter(Duration.SECOND); // 1_000 – 1_200
5 * Duration.MINUTE; // 300_000
Duration.parse("500ms"); // 500
5 * Duration.SECOND; // 5_000
2 * Duration.WEEK; // 1_209_600_000
```

```ts
Bytes.format(512); // "512 B"
2 * Bytes.GB; // 2_000_000_000
2 * Bytes.GiB; // 2_147_483_648
4 * Bytes.KB; // 4_000
64 * Bytes.KiB; // 65_536
128 * Bytes.MB; // 128_000_000
128 * Bytes.MiB; // 134_217_728
Bytes.parse("512B"); // 512
2 * Bytes.TB; // 2_000_000_000_000
2 * Bytes.TiB; // 2_199_023_255_552
```

<!-- /overview -->

### match

```ts
type Shape =
    | { kind: "circle"; radius: number }
    | { kind: "square"; size: number };

const area = (shape: Shape) => match.tag(shape, "kind", {
    circle: (circle) => Math.PI * circle.radius ** 2,
    square: (square) => square.size ** 2,
});

const label = (value: number | Shape | null) => match(value)
    .case(null, "nothing")
    .shape({ kind: "circle" }, "a circle")
    .cond((value) => typeof value === "number", "a number")
    .unwrapOr("something else");
```

If compiled with the plugin:

```ts
const area = (shape: Shape) =>
    shape.kind === "circle" ? Math.PI * shape.radius ** 2
    : shape.kind === "square" ? shape.size ** 2
    : throwUnmatched(shape);

const label = (value: number | Shape | null) =>
    value === null ? "nothing"
    : typeof value === "object" && value !== null && value.kind === "circle" ? "a circle"
    : typeof value === "number" ? "a number"
    : "something else";
```

### pipe

```ts
const open = (tasks: Task[]) => pipe(
    tasks,
    (tasks) => Array.removeWhere(tasks, (task) => task.done),
    (tasks) => Array.sortBy(tasks, (task) => task.dueAt),
);
```

If compiled with the plugin:

```ts
const open = (tasks: Task[]) =>
    sortBy(removeWhere(tasks, (task) => task.done), (task) => task.dueAt);
```

### Result

Success or failure as a value, with methods to continue from either. `ResultAsync` is the same for promises, without awaiting in between.

```ts
function parse(text: string): Result<number, "nan"> {
    const value = Number(text);
    return Number.isNaN(value) ? Err("nan") : Ok(value);
}

parse("2").map((value) => value * 2).unwrapOr(0); // 4

Result.all([parse("1"), parse("2")]); // Ok([1, 2])

const page = await ResultAsync
    .try(() => fetch(url), () => "offline" as const)
    .andThen((response) => response.ok ? Ok(response) : Err("failed" as const))
    .map((response) => response.text());
// Result<string, "offline" | "failed">
```

### Retry

Tries again for the failures you say are worth it, waiting longer every time. Giving up needs no error of its own: the result fails with the last one.

```ts
const result = await Retry.run(async () => {
    const response = await fetch(url);
    if (response.status === 503) return Retry.again("unavailable" as const);
    if (!response.ok) return Err("failed" as const);
    return Ok(await response.text());
}, { maxAttempts: 5, signal });
// Result<string, "unavailable" | "failed">
```

### Semaphore

A pool, a queue and a lock in one: a limited number of functions run at the same time, the others wait for their turn.

```ts
const hashing = Semaphore({ concurrency: 2, maxWaiting: 100 });
await hashing.run(() => Bun.password.hash(password));
// Result<string, SemaphoreFullError>, instead of letting more than 100 wait

const migrations = Semaphore({ concurrency: 1 });
await migrations.run(path, () => migrate(path)); // One at a time for each path
await migrations.idle();
```

### Emitter

A single event as a function: call it with a function to listen, and with anything else to tell the listeners. `AsyncEmitter` waits for its listeners, one after the other.

```ts
const onMessage = Emitter<string>();

const remove = onMessage((message) => console.log(message));
onMessage("hello");
remove();
```

Sending is batched and untracked, see signals. How listeners are called is yours to replace, to wrap it or to keep one that throws from stopping the others:

```ts
const onMessage = Emitter<string>((listeners, message) => {
    for (const listener of listeners) {
        try {
            listener(message);
        } catch (error) {
            report(error);
        }
    }
});
```

### Disposer

Collects what needs to be cleaned up, and does so in reverse order. Unlike a `DisposableStack` it is made to live long: a disposer that is added to others is removed from them when it is disposed by itself.

```ts
const app = Disposer();
const view = Disposer();

app.onDispose(view);
view.onDispose(() => socket.close());
view.onDispose(onMessage((message) => render(message)));

view.dispose(); // Closes the socket, stops listening, and is gone from `app`.
onClose(app.dispose); // `dispose` can be passed as it is.
```

Emitters and effects are disposed the same way: `onDispose`, `dispose` and `disposed`.

### Signals

Values that change over time, and what follows from them. A `Signal` holds a value, a `Memo` computes one from others, and an `Effect` runs again when what it read changed.

```ts
const $count = Signal(1);
const $double = Memo(() => $count() * 2);

const effect = Effect(() => {
    console.log($double());
    return () => console.log("cleanup");
}); // 2

$count(2); // "cleanup", 4
$count((count) => count + 1); // "cleanup", 6

effect.dispose(); // "cleanup"
```

`Batch` makes several changes count as one, and `Untrack` reads without depending on what is read. An `Emitter` does both while it calls its listeners, a `Disposer` while it disposes:

```ts
Batch(() => {
    $a(1);
    $b(1);
}); // Effects that read both run once.

Effect(() => console.log($a(), Untrack($b))); // Only runs again when $a changes.
```

An `Action` is a function that does both, for what changes several signals at once:

```ts
const moveTask = Action((id: string, sectionId: string) => {
    $tasks((tasks) => Object.set(tasks, id, { ...tasks[id], sectionId }));
    $selected(id);
});
```

`Effect.watch` is an effect that says what it depends on: it is called with the value and the one before, only once that changed, and reads whatever else it likes without depending on it.

```ts
Effect.watch($count, (count, before) => console.log(before, count));
```

In React, [`@monstermann/stdlib-react`](./packages/stdlib-react#readme) has `useSignal`, and the plugin writes it for you once that is installed. During development, effects and emitters are disposed when their module is replaced.

What only batches does not load signals: an `Emitter` on a server costs a counter.

## Installation

```sh
bun add @monstermann/stdlib
bun add -D @monstermann/stdlib-transform
```

Import `@monstermann/stdlib/globals` once, at the entry of your code, and add the plugin:

```ts
import { stdlib } from "@monstermann/stdlib-transform";

export default defineConfig({
    plugins: [stdlib({ enforce: "pre" })],
});
```

That is Vite, Rolldown and tsdown. [`@monstermann/stdlib-transform`](./packages/stdlib-transform#readme) has the options, and the setup for Bun.

### Globals

- `@monstermann/stdlib/globals`: Throws an error at runtime which is removed by the transformer - This is a safety net to ensure everything is set up properly
- `@monstermann/stdlib/patch`: Actually assigns everything to globals, throwing an error in case something is already taken - This is useful to run unit tests without having to transform them

## Size

With the plugin you ship the functions you use, and nothing else. Without it, `@monstermann/stdlib/patch` is everything:

<!-- size -->

|                                        | Minified | Gzip    | Brotli  |
| -------------------------------------- | -------- | ------- | ------- |
| Everything                             | 51.6 kB  | 17.9 kB | 13.6 kB |
| `match`, without the plugin            | 1.87 kB  | 0.68 kB | 0.60 kB |
| `Result` and `ResultAsync`             | 2.22 kB  | 0.58 kB | 0.53 kB |
| `String.slugify`, the largest function | 19.1 kB  | 6.28 kB | 3.67 kB |
| `Array.removeAll`, a typical one       | 0.45 kB  | 0.28 kB | 0.25 kB |

<!-- /size -->

## Lessons learned

What I learned building this, maybe that is useful to somebody.

### Pattern matching

- [gvergnaud/ts-pattern](https://github.com/gvergnaud/ts-pattern) is a banger, probably the best type-safe pattern matching there is.
- It is going to show up in your performance profiles when you use it in a loop: 137 to 200 ns for a chain of three to six branches, where the conditional you would have written by hand takes 5 ns.
- This library ships a slimmed down, good enough matcher that the plugin compiles into that conditional:

    |                          | ts-pattern | `match` | `match`, compiled |
    | ------------------------ | ---------- | ------- | ----------------- |
    | six values               | 150 ns     | 11 ns   | 5 ns              |
    | three objects by a field | 137 ns     | 19 ns   | 5 ns              |
    | three tuples of two      | 200 ns     | 27 ns   | 6 ns              |

- A plugin that knows the types of what it transforms is not a thing yet in 2026, so this one does not know whether `a` in `.with(a, …)` is a value to compare with or an object to look into. That is why there is no `with`, you say what you mean: `case` compares with `===`, `shape` compares field by field, `cond` asks a function.

### Currying

I was a big fan of currying, in particular the "data-first / data-last" approach of Remeda and Effect: `Arr.find(tasks, isDone)` and `pipe(tasks, Arr.find(isDone))`. A couple of issues:

- **Inconsistency.** It is annoying to apply to your own functions, so you end up with code where some things are curried and some are not.
- **Errors.** It is done with overloads: you do not see what went wrong, you get a list of overloads your code does not match. When the first step of a pipe is wrong, the error shows up on the second one.
- **Editor.** Autocomplete assumes data-first until the whole call is written, you can not hover a parameter to ask what it is, and optional parameters are not straightforward.
- **Bloat.** You end up shipping `add(1, 1)`, because `1 + 1` can not be curried. Same for `Arr.find()`, which does nothing `tasks.find()` does not do. Of the 354 functions this library previously had, 100 were that.
- **Functions only.** Currying makes classes awkward.
- **Speed.** Not a big deal, but you pay for it on every call.

Functions are plain data-first now, and `pipe` takes lambdas. The plugin replaces a `pipe` call with the calls it makes, which takes it from 7.8 to 0.7 ns for three cheap steps.

### Variants

- Every function that can fail had three more: `findOr`, `findOrElse`, `findOrThrow`. That was another 133 of the 354.
- `??` does that: `tasks.find(isDone) ?? fallback`.

### Copy on write

Returning what you were given when nothing changed is only free when you look before you copy. It is tempting to copy first, and find out afterwards:

```ts
function map(target, fn) {
    let didChange = false;
    const result = target.map((before) => {
        const after = fn(before);
        didChange ||= before !== after;
        return after;
    });
    return didChange ? result : target;
}
```

That creates an array on every call, to throw it away whenever nothing changed. Copy once you know that there is something to write:

```ts
function map(target, fn) {
    let copy;
    for (let i = 0; i < target.length; i++) {
        const before = target[i];
        const after = fn(before);
        if (before === after) continue;
        // Copy once now that we know we are actually going to write:
        copy ??= [...target];
        copy[i] = after;
    }
    return copy ?? target;
}
```

### Mutations

A previous version built on [remmi](https://github.com/MichaelOstermann/remmi), which makes updates mutate inside of a scope:

```ts
withMutations(() => {
    const a = Arr.append([1, 2, 3], 4); // Copies
    const b = Arr.append(a, 5); // Mutates
});
```

- I thought this was pretty cool.
- Plot twist: it wasn't, I used it 6 times in an app that calls this library around 210 times.
- It took 13 files, and something every updating function had to ask on every call.
- Due to how it had to be typed, not a single function supported `readonly`.
- You should know your hot paths anyway. Copy once yourself, then mutate.

`{ mut: true }` is what is left of it: said per call instead of per scope, and a type error for a `readonly` array. It is up to 2.8 times as fast as copying.

```ts
const draft = [...tasks];
Array.removeAll(draft, done, { mut: true });
Array.mapFirstWhere(draft, (task) => task.id === id, rename, { mut: true });
```

Only arrays have it, as nothing native removes by value or maps in place. Maps, sets and objects need no option for that: `map.set()`, `set.add()`, `Object.assign()`.

### Globals

Utilities have to live somewhere, and every option has a price:

- Functions of their own (`removeAll`, `merge`): at some point two of them want the same name, and you are back to a prefix or suffix, `removeAllFromArray`.
- Namespaces of your own (`Arr.removeAll`), which is what this library had before: now there are three places to look for something that works on an array. Its methods, `Array`, and `Arr`.
- The globals that are there already (`Array.removeAll`): one place, which autocomplete knows about. The price is that you are patching globals.

Two things make the last one bearable:

- The plugin replaces every use with an import, so nothing is patched when the code runs.
- The types declare properties instead of methods. Should the language ship an `Array.removeAll` one day, that is a type error, and not silently another overload of it.

### OXC

The plugin is built on [OXC](https://oxc.rs): `oxc-parser` to read a file, `oxc-walker` to walk through it and to know what a name refers to, and `magic-string` to replace parts of it and get the source map for free. I am having a lot of fun with it lately, building transformations, tools and build-time optimizations.

- It is fast enough to not think about it: the 1,400 files of an app go through the plugin in about 0.2 seconds. Most of them are not even parsed, a look at the text tells whether there is anything to replace.
- It is easy. `match` and `pipe` are a few hundred lines each, and this is the kind of well-defined problem that is quick to vibe code: the input is code, the output is code, and whether it is right can be easily tested via snapshots.
- Replacing an abstraction at build time means you can have it for free. `match` is 2 to 4 times as fast compiled, `pipe` 11 times.
- What it can not do is know about types, it only sees what is written. Design around that, see pattern matching.

### Result

Nothing to explain here that has not been explained elsewhere, only what I ran into:

- As functions (`Result.map(result, fn)`): very verbose, very annoying to use to my surprise, because I generally prefer functions.
- As objects with methods (`result.map(fn)`): pretty banger, much more ergonomic.
    - The downside: a `ResultAsync` is not quite as interchangeable with a `Promise` as it was with functions.
- `Ok` and `Err` are upper case for a reason: with a global named `err`, every `catch` that forgot to name its error compiles.
- It is not about speed either way, an `Ok` instance costs 1 to 4 ns over returning a plain `{ ok, value }`.

Is it worth bringing results into a language that is not built around them (eg. making JavaScript more Rust-like)? Depends on where you are:

- Frontend: not really. Apart from `fetch` there is not much IO happening, and not much that can suddenly fail. It is more about rendering a fallback for something that is `null` or `undefined`, which `??` and `?.` do.
- Backend: yes. Databases, IO, processes, bad requests, validation, assertions, third-party code that throws from somewhere inside: all of that is pretty painful with exceptions, and decently manageable with results.

If results alone do not go far enough for you, there is [Effect](https://effect.website). It is too much for my taste: it almost turns JavaScript into another language, and everything you write has to be written its way. Maybe one day I will change my mind, kinda like I did with Tailwind.
