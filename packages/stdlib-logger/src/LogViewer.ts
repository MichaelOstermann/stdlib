import type { TSID } from "@monstermann/stdlib"
import type { Database, SQLQueryBindings } from "bun:sqlite"
import type { LogFields } from "./LogCompletion"
import type { Logger } from "./Logger"
import { Failure, JSON, Memo, Signal } from "@monstermann/stdlib"
import { CLI } from "@monstermann/stdlib-cli"
import { LogCompletion } from "./LogCompletion"
import { LogQuery } from "./LogQuery"

type NestedLevel = "error" | "warn" | null
type Row = Logger.Log & { nestedLevel: NestedLevel, rowid: number }
type StoredRow = Omit<Row, "data"> & { data: string }
type StoredLog = Omit<Logger.Log, "data"> & { data: string }
type TreeLog = { bodyGuide: string, headGuide: string, log: Logger.Log }
type Size = { height: number, width: number }

const POLL_INTERVAL = 100
const FIELDS_INTERVAL = 2000
const NO_COMPLETION: LogCompletion = { options: [], typed: "" }
const COLUMNS = `
    rowid,
    *,
    (
        WITH RECURSIVE descendants(id, level) AS (
            SELECT child.id, child.level FROM logs AS child WHERE child.parentId = logs.id
            UNION ALL
            SELECT child.id, child.level FROM logs AS child JOIN descendants ON child.parentId = descendants.id
        )
        SELECT CASE WHEN SUM(level = 'error') THEN 'error' WHEN SUM(level = 'warn') THEN 'warn' END FROM descendants
    ) AS nestedLevel
`

const LEVEL_COLORS: Record<Logger.Level, (text: string) => string> = {
    debug: CLI.cyan,
    error: CLI.red,
    info: CLI.blue,
    warn: CLI.yellow,
}

/**
 * # render
 *
 * Shows the logs of `db`, a database of `SQLiteLogger`, in the terminal: the newest at the bottom,
 * and the selected one with all of its children next to them. Follows new logs until you scroll up.
 * Returns a function that stops and gives the terminal back. Does not exit on Ctrl+C.
 *
 * ## Example
 *
 * ```ts
 * const stop = LogViewer.render(new Database("logs.db", { readonly: true }));
 *
 * CLI.onKey((key) => {
 *     if (key.ctrl && key.name === "c") process.exit(130);
 * });
 * ```
 */
function render(db: Database): () => void {
    const ancestorsOf = db.prepare<{ id: TSID }, [string]>(`
        WITH RECURSIVE ancestors(id, parentId) AS (
            SELECT id, parentId FROM logs WHERE id = ?
            UNION ALL
            SELECT logs.id, logs.parentId FROM logs JOIN ancestors ON logs.id = ancestors.parentId
        )
        SELECT id FROM ancestors
    `)
    const subtreeOf = db.prepare<StoredLog, [string]>(`
        WITH RECURSIVE tree(id) AS (SELECT ? UNION ALL SELECT logs.id FROM logs JOIN tree ON logs.parentId = tree.id)
        SELECT logs.id, parentId, date, level, message, data FROM logs JOIN tree USING (id) ORDER BY rowid
    `)
    const recentFields = db.prepare<{ key: string, value: string }, []>(`
        SELECT
            substr(tree.fullkey, 3) AS key,
            CASE WHEN tree.type IN ('true', 'false', 'null') THEN tree.type ELSE CAST(tree.atom AS TEXT) END AS value
        FROM (SELECT data FROM logs ORDER BY rowid DESC LIMIT 1000) AS recent, json_tree(recent.data) AS tree
        WHERE tree.type NOT IN ('object', 'array') AND tree.fullkey NOT LIKE '%[%'
        GROUP BY key, value
        ORDER BY COUNT(*) DESC
    `)

    /** Returns enough rows to fill the screen, wherever `anchorRowid` ends up on it. */
    function rows({ params, sql }: LogQuery.Where, anchorRowid: number | null, height: number): StoredRow[] {
        if (anchorRowid === null) return db.query<StoredRow, SQLQueryBindings[]>(`SELECT ${COLUMNS} FROM logs WHERE ${sql} ORDER BY rowid DESC LIMIT ?`).all(...params, height).toReversed()
        return [
            ...db.query<StoredRow, SQLQueryBindings[]>(`SELECT ${COLUMNS} FROM logs WHERE (${sql}) AND rowid < ? ORDER BY rowid DESC LIMIT ?`).all(...params, anchorRowid, height).toReversed(),
            ...db.query<StoredRow, SQLQueryBindings[]>(`SELECT ${COLUMNS} FROM logs WHERE (${sql}) AND rowid >= ? ORDER BY rowid LIMIT ?`).all(...params, anchorRowid, height),
        ]
    }

    function firstRow({ params, sql }: LogQuery.Where): { id: TSID, rowid: number } | null {
        return db.query<{ id: TSID, rowid: number }, SQLQueryBindings[]>(`SELECT rowid, id FROM logs WHERE ${sql} ORDER BY rowid LIMIT 1`).get(...params)
    }

    function countRowsAfter({ params, sql }: LogQuery.Where, rowid: number): number {
        return db.query<{ count: number }, SQLQueryBindings[]>(`SELECT COUNT(*) AS count FROM logs WHERE (${sql}) AND rowid > ?`).get(...params, rowid)?.count ?? 0
    }

    const $poll = Signal(0)
    const $height = Signal(process.stdout.rows)
    const resize = () => $height(process.stdout.rows)
    process.stdout.on("resize", resize)
    const search = CLI.input()
    const $searching = Signal(false)
    const $where = Memo(() => rowsWhere(LogQuery.parse(search.$value())))
    const $anchorRowid = Signal<number | null>(null)
    const $rows = Memo(() => {
        $poll()
        return rows($where(), $anchorRowid(), $height()).map(parseRow)
    }, { equals: sameRows })
    const $selectedId = Signal<TSID | null>(null)
    const $selected = Memo(() => $rows().find((row) => row.id === $selectedId()) ?? $rows().at(-1))
    const $tree = Memo(() => {
        $poll()
        const selected = $selected()
        if (!selected) return []
        const rootId = ancestorsOf.all(selected.id).at(-1)!.id
        return treeLogs(subtreeOf.all(rootId).map(parseLog))
    }, { equals: sameTree })
    const $fieldsTick = Memo(() => Math.floor($poll() / (FIELDS_INTERVAL / POLL_INTERVAL)))
    const $fields = Memo(() => {
        if (!$searching()) return new Map() as LogFields
        $fieldsTick()
        return fieldsOf(recentFields.all())
    })
    /** The option that Tab highlighted for Enter, or `null` before the first Tab. */
    const $optionIndex = Signal<number | null>(null)
    const $completion = Memo(() => {
        if (!$searching()) return NO_COMPLETION
        if (search.$cursor() !== search.$value().length) return NO_COMPLETION
        return LogCompletion.complete(search.$value(), $fields())
    })
    const $detailScroll = Signal<number | null>(null)
    let shownDetailScroll = 0
    let detailHeight = 0
    let shownLayout = { listSize: { height: 0, width: 0 }, sideBySide: false, top: 0 }

    const poll = setInterval(() => $poll((count) => count + 1), POLL_INTERVAL)

    const stopKeys = CLI.onKey((key) => {
        const { options } = $completion()
        if ($searching() && key.name === "Tab" && options.length) return $optionIndex(nextIndex($optionIndex(), key.shift ? -1 : 1, options.length))
        if ($searching() && key.name === "Enter" && $optionIndex() !== null) return acceptOption()
        $optionIndex(null)
        if ($searching() && key.name === "Enter") return $searching(false)
        if ($searching() && key.name === "Escape") return closeSearch()
        if ($searching() && !(key.name === "ArrowUp" || key.name === "ArrowDown")) return search.onKey(key) && follow()
        if (key.name === "/") return $searching(true)
        if (key.name === "Escape") return closeSearch()
        if (key.name === "c" && !key.ctrl) return process.stdout.write(clipboardSequence(JSON.stringify($tree().map((item) => item.log), null, 2)))

        if (key.name === "ArrowUp" && key.shift) return $detailScroll(shownDetailScroll - 1)
        if (key.name === "ArrowDown" && key.shift) return $detailScroll(shownDetailScroll + 1)
        if (key.name === "PageUp") return $detailScroll(shownDetailScroll - detailHeight)
        if (key.name === "PageDown") return $detailScroll(shownDetailScroll + detailHeight)

        const rows = $rows()
        const selected = rows.findIndex((row) => row.id === $selected()?.id)
        if (key.name === "ArrowUp") select(rows[Math.max(selected - 1, 0)])
        if (key.name === "ArrowDown") select(rows[Math.min(selected + 1, rows.length - 1)])
        if (key.name === "End" || key.name === "G") follow()
        if (key.name === "Home" || key.name === "g") select(firstRow($where()) ?? undefined)
    })

    const stopMouse = CLI.onMouse((mouse) => {
        const { listSize, sideBySide, top } = shownLayout
        const inList = sideBySide ? mouse.x < listSize.width : mouse.y < listSize.height
        const rows = $rows()
        const selected = rows.findIndex((row) => row.id === $selected()?.id)
        if (inList && mouse.name === "WheelUp") select(rows[Math.max(selected - 1, 0)])
        if (inList && mouse.name === "WheelDown") select(rows[Math.min(selected + 1, rows.length - 1)])
        if (inList && mouse.name === "MouseDown" && mouse.button === 0) select(rows[top + mouse.y] ?? rows[selected])
        if (!inList && mouse.name === "WheelUp") $detailScroll(shownDetailScroll - 3)
        if (!inList && mouse.name === "WheelDown") $detailScroll(shownDetailScroll + 3)
    })

    function select(row: { id: TSID, rowid: number } | undefined): void {
        $detailScroll(null)
        if (!row || row.id === $rows().at(-1)?.id) return follow()
        $selectedId(row.id)
        $anchorRowid(row.rowid)
    }

    function follow(): void {
        $detailScroll(null)
        $selectedId(null)
        $anchorRowid(null)
    }

    function acceptOption(): void {
        const { options, typed } = $completion()
        const value = search.$value().slice(0, search.$value().length - typed.length) + options[$optionIndex()!]
        search.$value(value)
        search.$cursor(value.length)
        $optionIndex(null)
        follow()
    }

    function belowCount(lastRowid: number): number {
        $poll()
        return countRowsAfter($where(), lastRowid)
    }

    function closeSearch(): void {
        search.clear()
        $searching(false)
        follow()
    }

    const leaveAlternateScreen = CLI.alternateScreen()

    let topId: TSID | undefined
    const stopRender = CLI.render(({ height, width }) => {
        const following = $selectedId() === null
        const sideBySide = width > (height - 2) * 3
        const [listSize, detailSize] = paneSizes({ height: height - 2, width }, sideBySide)

        const rows = $rows()
        const selected = rows.findIndex((row) => row.id === $selected()?.id)
        const top = windowTop(rows.findIndex((row) => row.id === topId), selected, listSize.height, rows.length)
        topId = rows[top]?.id
        shownLayout = { listSize, sideBySide, top }
        const visible = rows.slice(top, top + listSize.height)
        const withDate = [...visible, ...$tree().map((item) => item.log)].some((log) => !isToday(log.date))
        const list = fill(visible.map((row, index) => fit(rowText(row, withDate), listSize.width, top + index === selected)), listSize)

        const tree = treeTexts($tree(), $selected()?.id, detailSize.width, withDate)
        const maxScroll = Math.max(tree.texts.length - detailSize.height, 0)
        const autoScroll = tree.selectedIndex < detailSize.height ? 0 : tree.selectedIndex
        shownDetailScroll = Math.min(Math.max($detailScroll() ?? autoScroll, 0), maxScroll)
        detailHeight = detailSize.height
        const detail = fill(tree.texts.slice(shownDetailScroll, shownDetailScroll + detailSize.height), detailSize)

        const panes = sideBySide
            ? list.map((line, index) => `${line}${CLI.dim("│")}${detail[index]}`)
            : [...list, CLI.dim("─".repeat(width)), ...detail]
        const { options } = $completion()
        const status = following ? "" : followText(belowCount(visible.at(-1)?.rowid ?? 0))
        return [
            ...panes,
            searchText(search, $searching(), width),
            options.length ? optionsText(options, $optionIndex(), width) : infoText(hintsText(search, $searching()), status, width),
        ]
    })

    return () => {
        clearInterval(poll)
        process.stdout.off("resize", resize)
        stopKeys()
        stopMouse()
        stopRender()
        leaveAlternateScreen()
    }
}

/**
 * Returns the condition for the rows of the list: the logs that match `query`, or all logs without
 * a parent.
 */
function rowsWhere(query: LogQuery): LogQuery.Where {
    if (!query.length) return { params: [], sql: "parentId IS NULL" }
    return LogQuery.where(query)
}

/** Returns the size of the list and of the details, without the line between them. */
function paneSizes(size: Size, sideBySide: boolean): [Size, Size] {
    if (sideBySide) {
        const listWidth = Math.floor(size.width / 2)
        return [{ height: size.height, width: listWidth }, { height: size.height, width: size.width - listWidth - 1 }]
    }
    const listHeight = Math.floor(size.height / 2)
    return [{ height: listHeight, width: size.width }, { height: size.height - listHeight - 1, width: size.width }]
}

/** Returns as many options as fit into `width`, with the one at `highlighted` stressed. */
function optionsText(options: string[], highlighted: number | null, width: number): string {
    const texts: string[] = []
    let used = 0
    for (const [index, option] of options.entries()) {
        used += Bun.stringWidth(option) + 2
        if (used > width) break
        texts.push(index === highlighted ? CLI.bgBlack(option) : CLI.dim(option))
    }
    return texts.join("  ")
}

function searchText(search: CLI.Input, focused: boolean, width: number): string {
    // The cursor marker of the input takes a column until CLI.render removes it.
    if (focused) return fit(search(width - 1), width + 1, false)
    return fit(search.$value(), width, false)
}

function hintsText(search: CLI.Input, focused: boolean): string {
    if (focused) return "Enter to confirm · Esc to clear"
    if (search.$value()) return "/ to edit · Esc to clear · c to copy"
    return "/ to search · c to copy"
}

/** Returns `hints` on the left and `status` on the right. */
function infoText(hints: string, status: string, width: number): string {
    return fit(CLI.dim(hints), width - Bun.stringWidth(status), false) + status
}

/**
 * Returns the index `step` away from `index`, wrapping around. Without `index`, starts at the first
 * or the last.
 */
function nextIndex(index: number | null, step: number, count: number): number {
    if (index === null) return step > 0 ? 0 : count - 1
    return (index + step + count) % count
}

/**
 * Whether `before` and `after` hold the same rows, with the same descendants. Logs never change.
 */
function sameRows(before: Row[], after: Row[]): boolean {
    if (before.length !== after.length) return false
    return before.every((row, index) => row.rowid === after[index]!.rowid && row.nestedLevel === after[index]!.nestedLevel)
}

/** Whether `before` and `after` are the same tree. A tree only grows. */
function sameTree(before: TreeLog[], after: TreeLog[]): boolean {
    return before.length === after.length && before[0]?.log.id === after[0]?.log.id
}

/**
 * Puts each log below its parent, one level deeper. The first log is the root. The guides are lines
 * that lead from each log to its next sibling and to its children.
 */
function treeLogs(logs: Logger.Log[]): TreeLog[] {
    const children = Map.groupBy(logs.slice(1), (log) => log.parentId)
    const linesOf = (log: Logger.Log, headGuide: string, childGuide: string): TreeLog[] => {
        const logChildren = children.get(log.id) ?? []
        return [
            { bodyGuide: childGuide + (logChildren.length ? "│ " : "  "), headGuide, log },
            ...logChildren.flatMap((child, index) => {
                if (index === logChildren.length - 1) return linesOf(child, `${childGuide}└─ `, `${childGuide}   `)
                return linesOf(child, `${childGuide}├─ `, `${childGuide}│  `)
            }),
        ]
    }
    if (!logs[0]) return []
    return linesOf(logs[0], "", "")
}

/**
 * Returns the lines of every log in the tree with all details, and the index of the line of
 * `selectedId`.
 */
function treeTexts(tree: TreeLog[], selectedId: TSID | undefined, width: number, withDate: boolean): { selectedIndex: number, texts: string[] } {
    const texts: string[] = []
    let selectedIndex = 0
    for (const { bodyGuide, headGuide, log } of tree) {
        if (log.id === selectedId) selectedIndex = texts.length
        texts.push(fit(`${CLI.dim(headGuide)}${headText(log, withDate)}`, width, log.id === selectedId && headGuide !== ""))
        texts.push(...detailTexts(log, width - Bun.stringWidth(bodyGuide)).map((text) => `${CLI.dim(bodyGuide)}${text}`))
    }
    return { selectedIndex, texts }
}

function detailTexts(log: Logger.Log, width: number): string[] {
    if (log.level === "error") return CLI.formatError(log.data, { stack: true, width }).split("\n")
    if (!Object.keys(log.data).length) return []
    return CLI.formatJSON(log.data, { width }).split("\n")
}

/**
 * Returns the index of the first row on screen. Keeps `previousTop` when the selected row is on
 * screen, and scrolls just enough to show it when not.
 */
function windowTop(previousTop: number, selected: number, height: number, count: number): number {
    const top = previousTop === -1 ? count - height : previousTop
    if (selected < top) return Math.max(selected, 0)
    if (selected >= top + height) return selected - height + 1
    return Math.max(Math.min(top, count - height), 0)
}

function followText(below: number): string {
    if (below === 0) return CLI.dim("End to follow")
    if (below === 1) return CLI.dim("↓ 1 more log · End to follow")
    return CLI.dim(`↓ ${below} more logs · End to follow`)
}

/**
 * Cuts or pads `text` to exactly `width`. A highlighted line gets a background across the whole
 * width.
 */
function fit(text: string, width: number, highlighted: boolean): string {
    const cut = Bun.sliceAnsi(text, 0, width)
    const line = cut + " ".repeat(Math.max(width - Bun.stringWidth(cut), 0))
    if (highlighted) return CLI.bgBlack(line)
    return line
}

/** Adds empty lines until `lines` fills `size`. */
function fill(lines: string[], size: Size): string[] {
    return [...lines, ...Array.from({ length: size.height - lines.length }, () => " ".repeat(size.width))]
}

function rowText(row: Row, withDate: boolean): string {
    const marker = row.nestedLevel ? LEVEL_COLORS[row.nestedLevel]("●") : " "
    if (row.level === "error") return `${marker} ${headText(row, withDate)}  ${CLI.formatJSON(Failure.details(row.data as Failure), { compact: true })}`
    return `${marker} ${headText(row, withDate)}  ${CLI.formatJSON(row.data, { compact: true })}`
}

function headText(log: Logger.Log, withDate: boolean): string {
    const level = LEVEL_COLORS[log.level](CLI.bold(log.level.toUpperCase().padEnd(5)))
    const time = CLI.dim(dateText(new Date(log.date), withDate))
    const failure = log.data as Failure
    if (log.level === "error") return `${level} ${time} ${failure.name}: ${failure.message}`
    return `${level} ${time} ${log.message}`
}

/** Returns the local time, with the local day in front when `withDate` is set. */
function dateText(date: Date, withDate: boolean): string {
    const time = date.toLocaleTimeString(undefined, { hour12: false })
    if (!withDate) return time
    const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, "0")).join("-")
    return `${day} ${time}`
}

function isToday(date: string): boolean {
    return new Date(date).toDateString() === new Date().toDateString()
}

/** Returns the OSC 52 sequence that makes the terminal put `text` on the clipboard. */
function clipboardSequence(text: string): string {
    return `\x1b]52;c;${Buffer.from(text).toString("base64")}\x07`
}

/** Groups the values by key, the most common first. Leaves out values too long to suggest. */
function fieldsOf(rows: { key: string, value: string }[]): LogFields {
    const fields: LogFields = new Map()
    for (const { key, value } of rows) {
        const values = fields.get(key) ?? []
        if (value.length <= 40 && !value.includes("\n")) values.push(value)
        fields.set(key, values)
    }
    return fields
}

function parseLog(log: StoredLog): Logger.Log {
    return { ...log, data: JSON.parse(log.data) as JSON.Object }
}

function parseRow(row: StoredRow): Row {
    return { ...row, data: JSON.parse(row.data) as JSON.Object }
}

export const LogViewer = {
    render,
}
