import { bench } from "./bench"
import "@monstermann/stdlib/globals"

// pipe, replaced with the calls it makes with --transform, a call of pipe without:
// with three cheap steps, which engines inline along with pipe, and with steps too big for that, whose functions are created on every call.

const tasks = Array.from({ length: 10 }, (_, i) => ({ done: i % 2 === 0, title: `Task ${i}` }))

bench("cheap steps", 1, (value) => pipe(
    value,
    (value) => value + 1,
    (value) => value * 2,
    (value) => value - 3,
))

bench("bigger steps", tasks, (tasks) => pipe(
    tasks,
    (tasks) => Array.removeWhere(tasks, (task) => task.done),
    (tasks) => tasks.length,
    (count) => `${count} open`,
))
