# @monstermann/stdlib-react

React hooks for [`@monstermann/stdlib`](https://github.com/MichaelOstermann/stdlib#readme).

```tsx
import "@monstermann/stdlib/globals";
import { useSignal } from "@monstermann/stdlib-react";

const $count = Signal(0);
const $double = Memo(() => $count() * 2);

export function Counter({ offset }: { offset: number }) {
    const count = useSignal($count);
    const double = useSignal($double);
    // A function is turned into a memo:
    const total = useSignal(() => $count() + offset);

    return <button onClick={() => $count(count + 1)}>{total}</button>;
}
```

`useSignal` takes a signal, a memo or a function, subscribes the component with `useSyncExternalStore`, and returns the current value.

## Installation

```sh
bun add @monstermann/stdlib @monstermann/stdlib-react
```

## Without writing it

[`@monstermann/stdlib-transform`](../stdlib-transform#readme) writes the `useSignal` calls for you once this package is installed, `react: false` turns that off. Signals are recognized by their `$` prefix, in components and hooks:

```tsx
export function Counter({ offset }: { offset: number }) {
    const count = $count(); // useSignal($count)
    return <button>{$total(offset)}</button>; // useSignal(() => ($total(offset)))
}
```

What is read inside of a callback or an effect is left alone, only what a component or a hook reads while it renders is wrapped.
