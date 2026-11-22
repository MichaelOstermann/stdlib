/** Paths are relative to the folder `compile` runs in. */
export interface I18nOptions {
    /** Globs of the YAML files with the messages, such as `i18n/*.yaml`. */
    messages: string[]
    /** The folder to generate `index.ts` and `_messages.ts` in, such as `app/i18n`. */
    output: string
}

export interface I18nDiagnostic {
    column?: number
    /** Starts at 1. Missing when the mistake is about the whole file. */
    line?: number
    message: string
    /** Relative to the folder `compile` runs in. */
    path: string
}

export interface I18nResult {
    /** Mistakes that would break the output. Any error stops the output from being written. */
    errors: I18nDiagnostic[]
    /** The `output` folder and its number of messages. Missing when there are errors. */
    output?: { messages: number, path: string, written: boolean }
    /** Mistakes the output works with, such as a message that is not translated yet. */
    warnings: I18nDiagnostic[]
}
