import { defineConfig } from "blume"

export default defineConfig({
    ai: { openInChat: false },
    content: { root: "docs" },
    deployment: { base: "/stdlib", site: "https://michaelostermann.github.io" },
    description: "A utility library for TypeScript.",
    feedback: false,
    github: { owner: "MichaelOstermann", repo: "stdlib" },
    // The repository is linked in the header, see components/Search.astro.
    navigation: { repo: false },
    title: "stdlib",
})
