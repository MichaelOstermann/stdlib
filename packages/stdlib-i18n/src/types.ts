/** Paths are relative to the folder `compile` runs in. */
export interface I18nOptions {
    /** Globs of the YAML files with the messages, such as `i18n/*.yaml`. */
    messages: string[]
    /** The folder to generate `index.ts` and `_messages.ts` in, such as `app/i18n`. */
    output: string
}

export interface I18nDiagnostic {
    column?: number
    /** From 1, missing when the mistake is in the file as a whole. */
    line?: number
    message: string
    /** Relative to the folder `compile` runs in. */
    path: string
}

export interface I18nResult {
    /** Mistakes that would break the output, which is not written when there are any. */
    errors: I18nDiagnostic[]
    /** The `output` folder with its number of messages, missing when there are errors. */
    output?: { messages: number, path: string, written: boolean }
    /** Mistakes the output works with, such as a message that is not translated yet. */
    warnings: I18nDiagnostic[]
}
