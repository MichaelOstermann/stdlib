import { produce } from "immer"
import { create } from "mutative"
import { setPath } from "remeda"
import { bench } from "./bench"
import "@monstermann/stdlib/globals"

// Setting state.user.settings.theme: Object.setPath, compiled with --transform, against remeda setPath, and immer and mutative assigning the field.

const state = {
    filters: { query: "", sort: "date", status: "all" },
    tasks: Array.from({ length: 100 }, (_, i) => ({ done: false, id: i, tags: ["a", "b"], title: `Task ${i}` })),
    ui: { loading: false, modal: null, toast: null },
    user: {
        email: "ada@example.com",
        id: 1,
        name: "Ada",
        settings: { density: "compact", fontSize: 14, locale: "en", notifications: true, sidebar: true, sounds: false, theme: "light" as "dark" | "light", timezone: "UTC" },
    },
}

bench("nothing changed, stdlib", state, (state) => Object.setPath(state, "user.settings.theme", "light"))
bench("nothing changed, remeda", state, (state) => setPath(state, ["user", "settings", "theme"], "light"))
bench("nothing changed, immer", state, (state) => produce(state, (draft) => {
    draft.user.settings.theme = "light"
}))
bench("nothing changed, mutative", state, (state) => create(state, (draft) => {
    draft.user.settings.theme = "light"
}))

bench("something changed, stdlib", state, (state) => Object.setPath(state, "user.settings.theme", "dark"))
bench("something changed, remeda", state, (state) => setPath(state, ["user", "settings", "theme"], "dark"))
bench("something changed, immer", state, (state) => produce(state, (draft) => {
    draft.user.settings.theme = "dark"
}))
bench("something changed, mutative", state, (state) => create(state, (draft) => {
    draft.user.settings.theme = "dark"
}))
