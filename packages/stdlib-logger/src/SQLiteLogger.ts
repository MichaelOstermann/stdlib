import type { Logger } from "./Logger"
import { Duration, JSON } from "@monstermann/stdlib"
import { Database } from "bun:sqlite"

/** Writes logs into a SQLite database, in batches. `db` is open for queries of your own. */
export interface SQLiteLogger {
    readonly db: Database
    readonly close: () => void
    readonly write: (log: Logger.Log) => void
}

type Row = Omit<Logger.Log, "data"> & { data: string, expiresAt: string | null }

const FLUSH_DELAY = 100
const BATCH_SIZE = 1000

/**
 * Each step moves the schema up by one version. Add new steps at the end, never change old ones.
 */
const MIGRATIONS: ((db: Database) => void)[] = [
    (db) => {
        db.run(`
            CREATE TABLE logs (
                id TEXT NOT NULL UNIQUE,
                parentId TEXT,
                date TEXT NOT NULL,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                data TEXT NOT NULL,
                expiresAt TEXT
            ) STRICT
        `)
        db.run("CREATE INDEX logs_parentId ON logs (parentId)")
        db.run("CREATE INDEX logs_expiresAt ON logs (expiresAt)")
        db.run("CREATE INDEX logs_date ON logs (date)")
    },
]

/**
 * # create
 *
 * Opens or creates the database at `path` and returns a `SQLiteLogger`. `write` collects logs and
 * writes them within 100 ms, or right away once 1000 are waiting. `close` writes what is waiting
 * and closes the database, so call it before the process exits.
 *
 * `retention` returns how many milliseconds to keep a log, or `null` to keep it forever. Expired
 * logs get deleted when the database opens, and every hour after that.
 *
 * ## Example
 *
 * ```ts
 * const sqlite = SQLiteLogger.create({
 *     path: "logs.db",
 *     retention: (log) => log.level === "debug" ? Duration.DAY : null,
 * });
 * const logger = Logger.create(sqlite.write);
 *
 * // Before the process exits:
 * sqlite.close();
 * ```
 */
function create(options: { path: string, retention?: (log: Logger.Log) => number | null }): SQLiteLogger {
    const db = new Database(options.path, { create: true, strict: true })

    db.run("PRAGMA journal_mode = WAL")
    db.run("PRAGMA synchronous = NORMAL")
    db.run("PRAGMA busy_timeout = 5000")
    migrate(db)

    const insert = db.prepare<void, Row>(
        "INSERT INTO logs (id, parentId, date, level, message, data, expiresAt) VALUES ($id, $parentId, $date, $level, $message, $data, $expiresAt)",
    )
    const insertMany = db.transaction((logs: Logger.Log[]) => {
        for (const log of logs) insert.run({ ...log, data: JSON.safeStringify(log.data), expiresAt: expiresAt(log) })
    })
    const deleteBefore = db.prepare<void, [string]>("DELETE FROM logs WHERE expiresAt < ?")

    function expiresAt(log: Logger.Log): string | null {
        const retention = options.retention?.(log) ?? null
        if (retention === null) return null
        return new Date(Date.parse(log.date) + retention).toISOString()
    }

    let buffer: Logger.Log[] = []
    let flushTimer: Timer | undefined

    function flush(): void {
        clearTimeout(flushTimer)
        flushTimer = undefined
        const logs = buffer
        buffer = []
        insertMany(logs)
    }

    function prune(): void {
        deleteBefore.run(new Date().toISOString())
    }

    prune()
    const pruneTimer = setInterval(prune, Duration.HOUR).unref()

    return {
        db,
        close() {
            clearInterval(pruneTimer)
            flush()
            db.run("PRAGMA optimize")
            db.close()
        },
        write(log) {
            buffer.push(log)
            if (buffer.length >= BATCH_SIZE) flush()
            else flushTimer ??= setTimeout(flush, FLUSH_DELAY).unref()
        },
    }
}

function migrate(db: Database): void {
    db.transaction(() => {
        const { user_version: version } = db.query<{ user_version: number }, []>("PRAGMA user_version").get()!
        for (const step of MIGRATIONS.slice(version)) step(db)
        db.run(`PRAGMA user_version = ${MIGRATIONS.length}`)
    }).immediate()
}

export const SQLiteLogger = {
    create,
}
