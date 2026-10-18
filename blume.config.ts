import { defineConfig } from "blume"

export default defineConfig({
    ai: { openInChat: false },
    content: { root: "docs" },
    description: "A utility library for TypeScript.",
    feedback: false,
    github: { owner: "MichaelOstermann", repo: "stdlib" },
    title: "stdlib",
})
