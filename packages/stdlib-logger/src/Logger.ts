import type { Failure, JSON } from "@monstermann/stdlib"
import { TSID } from "@monstermann/stdlib"

/**
 * Writes logs through the function given to `Logger.create`. Each method returns the id of the new
 * log. A log of `logger.child(id)` has `id` as its parent, so the logs of one request form a tree.
 */
export interface Logger {
    readonly child: (parentId: TSID) => Logger
    readonly debug: (message: string, data?: JSON.Object) => TSID
    readonly error: (failure: Failure) => TSID
    readonly info: (message: string, data?: JSON.Object) => TSID
    readonly log: (log: Logger.Log) => void
    readonly warn: (message: string, data?: JSON.Object) => TSID
}

export namespace Logger {
    export type Level =
        | "debug"
        | "error"
        | "info"
        | "warn"

    /**
     * What `Logger.create` gets for each log. `data` is the object passed to the method, not a
     * copy.
     */
    export interface Log {
        data: JSON.Object
        date: string
        id: TSID
        level: Level
        message: string
        parentId: TSID | null
    }
}

/**
 * # create
 *
 * Creates a `Logger` that calls `write` with each log. `write` gets the object passed as data as it
 * is, so changing it changes the log too. Copy it in `write` when that matters.
 *
 * ## Example
 *
 * ```ts
 * const sqlite = SQLiteLogger.create({ path: "logs.db" });
 * const logger = Logger.create(sqlite.write);
 *
 * const requestId = logger.info("Request", { method: "GET", path: "/api/sync" });
 * const log = logger.child(requestId);
 * log.debug("Query", { sql });
 * log.error(Failure.from(error));
 * log.info("Response", { status: 500, duration: 412 });
 * ```
 */
function create(write: (log: Logger.Log) => void): Logger {
    return createWithParent(write, null)
}

function createWithParent(write: (log: Logger.Log) => void, parentId: TSID | null): Logger {
    function emit(level: Logger.Level, message: string, data: JSON.Object): TSID {
        const id = TSID.create()
        write({ data, date: new Date().toISOString(), id, level, message, parentId })
        return id
    }

    return {
        log: write,
        child: (childParentId) => createWithParent(write, childParentId),
        debug: (message, data = {}) => emit("debug", message, data),
        error: (failure) => emit("error", failure.message, failure),
        info: (message, data = {}) => emit("info", message, data),
        warn: (message, data = {}) => emit("warn", message, data),
    }
}

export const Logger = {
    create,
}
