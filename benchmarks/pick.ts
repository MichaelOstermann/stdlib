import { Object } from "@monstermann/stdlib"
import { bench } from "./bench"
// Taking what a list shows of a user: Object.pick, compiled with --transform.

const user = { createdAt: 0, email: "jane@miko.dev", id: 1, name: "Jane", role: "admin", teams: ["a", "b"] }

bench("three keys", user, (user) => Object.pick(user, ["email", "name", "role"]))
