import { Array, Duration, match, Ok, pipe } from "@monstermann/stdlib"

export const result = pipe(
    ["1ms", `${Duration.SECOND}ms`],
    (durations) => Array.map(durations, (duration) => match(Duration.parse(duration)).case(1, "one").unwrapOr("other")),
    (values) => Array.removeAll(values, ["other"]),
    (values) => Ok(values[0]).unwrapOrElse(() => "none"),
)
