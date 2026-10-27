import { pick } from "remeda"
import { bench } from "./bench"
import "@monstermann/stdlib/globals"

// Picking the id and the title of a task: Object.pick, compiled with --transform, against remeda pick.

const task = { createdAt: 0, done: false, id: 1, project: "inbox", tags: ["a", "b"], title: "Task" }

bench("stdlib", task, (task) => Object.pick(task, ["id", "title"]))
bench("remeda", task, (task) => pick(task, ["id", "title"]))
