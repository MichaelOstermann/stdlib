import { merge } from "remeda"
import { bench } from "./bench"
import "@monstermann/stdlib/globals"

// Setting the title and the status of a task: Object.merge, compiled with --transform, against remeda merge.

const task = { createdAt: 0, done: false, id: 1, project: "inbox", tags: ["a", "b"], title: "Task" }

bench("nothing changed, stdlib", task, (task) => Object.merge(task, { done: false, title: "Task" }))
bench("nothing changed, remeda", task, (task) => merge(task, { done: false, title: "Task" }))

bench("something changed, stdlib", task, (task) => Object.merge(task, { done: true, title: "New" }))
bench("something changed, remeda", task, (task) => merge(task, { done: true, title: "New" }))
