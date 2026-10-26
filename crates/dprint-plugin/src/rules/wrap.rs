//! JSDoc comments wrapped at 100 columns.
//!
//! The text of a JSDoc comment is Markdown, so it goes through dprint's Markdown formatter, which joins the
//! lines of a paragraph and breaks them again where they reach the width. Code blocks, headings, lists and
//! tables keep their shape, and so do the `@` tags at the end, which Markdown would join into one paragraph.
//!
//! A JSDoc comment on one line stays on one line while it fits. Only comments on lines of their own are
//! wrapped: one after code has no column of its own to wrap to. `//` comments stay as they are written, a
//! line of their own often means something there: one point per line, code, a diagram.

use dprint_plugin_markdown::configuration::ConfigurationBuilder;
use dprint_plugin_markdown::configuration::TextWrap;

use crate::edits::Edits;
use crate::source::Source;

const WIDTH: usize = 100;

pub fn run(source: &Source, edits: &mut Edits) {
    let text = source.text;
    for comment in &source.program.comments {
        let (start, end) = (comment.span.start as usize, comment.span.end as usize);
        let line_start = text[..start].rfind('\n').map_or(0, |index| index + 1);
        let indent = &text[line_start..start];
        if !indent.trim().is_empty() || comment.is_line() {
            continue;
        }
        if let Some(wrapped) = jsdoc(&text[start..end], indent) {
            edits.replace(start, end, wrapped);
        }
    }
}

/// The comment rewrapped, or `None` when it is not a JSDoc comment, or already wrapped.
fn jsdoc(comment: &str, indent: &str) -> Option<String> {
    let inner = comment.strip_prefix("/**")?.strip_suffix("*/")?;
    if inner.starts_with('*') || inner.trim().is_empty() {
        return None;
    }

    let one_line = !inner.contains('\n');
    let lines: Vec<&str> = if one_line {
        vec![inner.trim()]
    }
    else {
        // Only the usual shape: `/**` and `*/` on lines of their own, and a `*` in front of every line between.
        let (first, rest) = inner.split_once('\n')?;
        let (body, last) = rest.rsplit_once('\n')?;
        if !first.trim().is_empty() || !last.trim().is_empty() {
            return None;
        }
        let lines: Option<Vec<&str>> = body.split('\n').map(|line| line.trim_start().strip_prefix('*').map(|line| line.strip_prefix(' ').unwrap_or(line))).collect();
        lines?
    };

    // The tags, from the first line that starts with one.
    let tags_from = lines.iter().position(|line| line.starts_with('@')).unwrap_or(lines.len());
    let (description, tags) = lines.split_at(tags_from);

    let width = WIDTH.saturating_sub(indent.len() + " * ".len()).max(20);
    let config = ConfigurationBuilder::new().line_width(width as u32).text_wrap(TextWrap::Always).build();
    let separated = description.last().is_some_and(|line| line.trim().is_empty());
    let description = protect_code_spans(description);
    let formatted = dprint_plugin_markdown::format_text(&description, &config, |_, _, _| Ok(None)).ok()?.unwrap_or_else(|| description.clone()).replace(KEPT_SPACE, " ");
    // Markdown has opinions beyond line breaks, `__proto__` is bold to it: those comments stay as they are.
    let visible = |text: &str| text.chars().filter(|character| !character.is_whitespace() && *character != KEPT_SPACE).collect::<String>();
    if visible(&formatted) != visible(&description) {
        return None;
    }
    let mut wrapped: Vec<&str> = formatted.trim_end().split('\n').filter(|_| !formatted.trim().is_empty()).collect();
    if !tags.is_empty() {
        // The blank line between the description and the tags, if there was one.
        if separated && !wrapped.is_empty() {
            wrapped.push("");
        }
        wrapped.extend(tags);
    }

    if one_line && wrapped.len() == 1 && indent.len() + "/** ".len() + wrapped[0].len() + " */".len() <= WIDTH {
        let single = format!("/** {} */", wrapped[0]);
        return (single != comment).then_some(single);
    }
    let body: String = wrapped.iter().map(|line| if line.is_empty() { format!("{indent} *\n") } else { format!("{indent} * {line}\n") }).collect();
    let multi = format!("/**\n{body}{indent} */");
    (multi != comment).then_some(multi)
}

/// Stands in for the spaces of a code span while Markdown wraps the text, which would break the span apart.
const KEPT_SPACE: char = '\u{E000}';

/// The lines joined, with the spaces inside code spans outside of code blocks replaced by `KEPT_SPACE`.
fn protect_code_spans(lines: &[&str]) -> String {
    let mut fenced = false;
    let lines = lines.iter().map(|line| {
        if line.trim_start().starts_with("```") || line.trim_start().starts_with("~~~") {
            fenced = !fenced;
        }
        if fenced {
            return line.to_string();
        }
        // A code span opens with a run of backticks and closes with a run of the same length.
        let characters: Vec<char> = line.chars().collect();
        let run_at = |index: usize| characters[index..].iter().take_while(|character| **character == '`').count();
        let mut protected = characters.clone();
        let mut index = 0;
        while index < characters.len() {
            let run = run_at(index);
            if run == 0 {
                index += 1;
                continue;
            }
            let close = (index + run..characters.len()).find(|&at| run_at(at) == run && (at == 0 || characters[at - 1] != '`'));
            let Some(close) = close else { break };
            for character in &mut protected[index + run..close] {
                if *character == ' ' {
                    *character = KEPT_SPACE;
                }
            }
            index = close + run;
        }
        protected.into_iter().collect::<String>()
    });
    lines.collect::<Vec<String>>().join("\n")
}

#[cfg(test)]
mod tests {
    use crate::testing::format;
    use crate::testing::unchanged;

    const LONG: &str = "Reads `argv` into what should happen, without printing or running anything: the command to run with its values, or every error.";

    #[test]
    fn paragraphs() {
        assert_eq!(
            format(&format!("/**\n * {LONG}\n */\nconst a = 1\n")),
            "/**\n * Reads `argv` into what should happen, without printing or running anything: the command to run\n * with its values, or every error.\n */\nconst a = 1\n",
        );
        // A code span is never broken apart.
        assert_eq!(
            format("/**\n * When `interactive`, names can also be abbreviated, as long as only one fits, `mem a --fn` for `members add --first-name`.\n */\nconst a = 1\n"),
            "/**\n * When `interactive`, names can also be abbreviated, as long as only one fits, `mem a --fn` for\n * `members add --first-name`.\n */\nconst a = 1\n",
        );
        assert_eq!(
            format("/**\n * Strips the remaining diacritics. The ASCII ones, `^` and `` ` ``, are kept: they are separators like in any other input.\n */\nconst a = 1\n"),
            "/**\n * Strips the remaining diacritics. The ASCII ones, `^` and `` ` ``, are kept: they are separators\n * like in any other input.\n */\nconst a = 1\n",
        );
        // Short lines of one paragraph are joined.
        assert_eq!(format("/**\n * One\n * paragraph.\n *\n * Two.\n */\nconst a = 1\n"), "/**\n * One paragraph.\n *\n * Two.\n */\nconst a = 1\n");
    }

    #[test]
    fn indented() {
        assert_eq!(
            format(&format!("class A {{\n    /** {LONG} */\n    b = 1\n}}\n")),
            "class A {\n    /**\n     * Reads `argv` into what should happen, without printing or running anything: the command to\n     * run with its values, or every error.\n     */\n    b = 1\n}\n",
        );
    }

    #[test]
    fn markdown_keeps_its_shape() {
        unchanged("/**\n * # resolve\n *\n * ```ts\n * function resolve(commands: Command[], argv: string[], options: { interactive: boolean }): Promise<Outcome>\n * ```\n *\n * - One\n * - Two\n */\nconst a = 1\n");
        unchanged("/**\n * The value.\n *\n * @default 1\n * @example\n * f(a,\n *   b)\n */\nconst a = 1\n");
    }

    #[test]
    fn left_alone() {
        unchanged("/** Short. */\nconst a = 1\n");
        unchanged(&format!("const a = 1 /** {LONG} */\n"));
        unchanged(&format!("/* {LONG} */\nconst a = 1\n// {LONG}\n// and on.\n"));
        unchanged("/**\n * One\n * two */\nconst a = 1\n");
        // Markdown would make `__proto__` bold.
        unchanged("/**\n * A key like __proto__\n * is a key like any other.\n */\nconst a = 1\n");
    }
}
