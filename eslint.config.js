import eslint from "@monstermann/eslint-config"

export default eslint().then(configs => [
    { ignores: [".blume", "dist", "target"] },
    ...configs,
])
