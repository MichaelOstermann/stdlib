// Taken from detectAgent of std-env@4.3.0, src/agents.ts, MIT License, Copyright (c) Pooya Parsa.

/** Set by the agent itself, the convention for any agent: `AI_AGENT=claude-code_2-1-310_agent`. */
const CONVENTION = "AI_AGENT"

/** Set by one agent each, for the ones that don't set `AI_AGENT`. */
const VARIABLES = [
    "AUGMENT_AGENT", // Auggie
    "CLAUDECODE", // Claude Code
    "CLAUDE_CODE",
    "CODEX_SANDBOX", // Codex
    "CODEX_THREAD_ID",
    "COPILOT_AGENT", // GitHub Copilot
    "COPILOT_CLI",
    "CURSOR_AGENT", // Cursor
    "GEMINI_CLI", // Gemini CLI
    "GOOSE_PROVIDER", // Goose
    "JUNIE_DATA", // Junie
    "JUNIE_SHIM_PATH",
    "OPENCODE", // opencode
    "REPL_ID", // Replit
]

/**
 * # isAgent
 *
 * ```ts
 * function CLI.isAgent(): boolean
 * ```
 *
 * Whether a coding agent runs this process: Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot
 * and others, by the environment variables they set.
 */
export function isAgent(): boolean {
    const env = process.env
    if (env[CONVENTION]) return true
    if (VARIABLES.some((name) => env[name])) return true
    // These only leave a trace in a variable that is also set for other reasons.
    if (/\.pi[\\/]agent/.test(env["PATH"] ?? "")) return true // pi
    if ((env["EDITOR"] ?? "").includes("devin")) return true // Devin
    if ((env["TERM_PROGRAM"] ?? "").includes("kiro") && !process.stdout.isTTY) return true // Kiro, its terminal is a TTY when a person uses it
    return false
}
