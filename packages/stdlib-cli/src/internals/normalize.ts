/** `firstName`, `first-name`, `FIRST_NAME` and `--first-name` are all `firstname`. */
export function normalize(name: string): string {
    return name.replace(/[^a-z0-9]/gi, "").toLowerCase()
}
