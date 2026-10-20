import type { OxlintConfig, OxlintOverride } from "oxlint"

export interface Options {
    ignores?: string[]
    overrides?: OxlintOverride[]
    react?: boolean
    tailwind?: string
}

export type Config = Pick<OxlintConfig, "jsPlugins" | "overrides" | "plugins" | "rules" | "settings">
