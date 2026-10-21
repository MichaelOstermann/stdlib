import { defineConfig } from "blume"

export default defineConfig({
    ai: { openInChat: false },
    content: { root: "docs" },
    deployment: { base: "/stdlib", site: "https://michaelostermann.github.io" },
    description: "A utility library for TypeScript.",
    feedback: false,
    github: { owner: "MichaelOstermann", repo: "stdlib" },
    title: "stdlib",
})
