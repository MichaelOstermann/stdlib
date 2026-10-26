/**
 * # isCI
 *
 * ```ts
 * function CLI.isCI(): boolean
 * ```
 *
 * Whether this runs in continuous integration, by the `CI` variable that GitHub Actions, GitLab,
 * CircleCI, Buildkite and most others set.
 */
export function isCI(): boolean {
    return !!process.env["CI"]
}
