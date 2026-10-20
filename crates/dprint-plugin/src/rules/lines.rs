//! Line-level whitespace: `eol-last`, `no-trailing-spaces`, `no-multiple-empty-lines` and line endings.
//!
//! Text inside template literals is part of a string and is left alone, apart from `\r\n` becoming `\n`,
//! which doesn't change the string's value.

use crate::edits::Edits;
use crate::source::Source;
use crate::source::Token;

struct Line {
    start: usize,
    /// End of the line's text, excluding its line break.
    end: usize,
    /// Start of the next line, or the end of the file for the last line.
    next: usize,
    /// End of the text once trailing whitespace is stripped.
    trimmed: usize,
    /// The line ends in `\r\n`.
    crlf: bool,
    /// The line has a line break; only the last line can lack one.
    terminated: bool,
    /// The line break sits inside a template literal.
    in_template: bool,
}

impl Line {
    fn is_blank(&self) -> bool {
        self.trimmed == self.start && !self.in_template
    }
}

pub fn run(source: &Source, edits: &mut Edits) {
    let (text, tokens) = (source.text, source.tokens.as_slice());
    let lines = lines(text, tokens);

    let Some(first) = lines.iter().position(|line| !line.is_blank()) else {
        edits.delete(0, text.len());
        return;
    };
    let last = lines.iter().rposition(|line| !line.is_blank()).unwrap_or(first);

    let mut previous_blank = false;
    for (index, line) in lines.iter().enumerate() {
        let blank = line.is_blank();

        // No blank lines at the start or end of the file, and at most one in a row.
        if index < first || index > last || (blank && previous_blank) {
            edits.delete(line.start, line.next);
            continue;
        }
        previous_blank = blank;

        if index == last && !line.terminated {
            edits.replace(line.trimmed, line.end, "\n");
            continue;
        }

        if !line.in_template {
            edits.delete(line.trimmed, line.end);
        }
        if line.crlf {
            edits.delete(line.end, line.end + 1);
        }
    }
}

fn lines(text: &str, tokens: &[Token]) -> Vec<Line> {
    let bytes = text.as_bytes();
    let mut templates = tokens.iter().filter(|token| token.is_template()).peekable();
    let mut lines = Vec::new();
    let mut start = 0;

    loop {
        let line_break = bytes[start..].iter().position(|&byte| byte == b'\n').map(|offset| start + offset);
        let crlf = line_break.is_some_and(|at| at > start && bytes[at - 1] == b'\r');
        let end = line_break.map_or(bytes.len(), |at| if crlf { at - 1 } else { at });
        let next = line_break.map_or(bytes.len(), |at| at + 1);

        while templates.peek().is_some_and(|token| token.end <= end) {
            templates.next();
        }
        let in_template = line_break.is_some() && templates.peek().is_some_and(|token| token.start < end);

        let trimmed = bytes[start..end].iter().rposition(|byte| !matches!(byte, b' ' | b'\t' | 0x0B | 0x0C)).map_or(start, |offset| start + offset + 1);

        lines.push(Line { start, end, next, trimmed, crlf, terminated: line_break.is_some(), in_template });

        if line_break.is_none() {
            break;
        }
        start = next;
    }

    // A file ending in a line break has no last line to speak of.
    if lines.last().is_some_and(|line| line.start == bytes.len()) && lines.len() > 1 {
        lines.pop();
    }

    lines
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use crate::Configuration;
    use crate::format_text;

    fn format(text: &str) -> String {
        format_text(Path::new("test.tsx"), text, &Configuration::default()).unwrap().unwrap_or_else(|| text.to_string())
    }

    #[test]
    fn eol_last() {
        assert_eq!(format("a"), "a\n");
        assert_eq!(format("a\n"), "a\n");
        assert_eq!(format("a\n\n\n"), "a\n");
        assert_eq!(format("a  "), "a\n");
        assert_eq!(format("a\n  "), "a\n");
        assert_eq!(format(""), "");
        assert_eq!(format("\n\n"), "");
        assert_eq!(format("  \n"), "");
    }

    #[test]
    fn no_trailing_spaces() {
        assert_eq!(format("a  \nb\t\n"), "a\nb\n");
        assert_eq!(format("// comment  \n/* a  \n b */  \n"), "// comment\n/* a\n b */\n");
        assert_eq!(format("a\n   \nb\n"), "a\n\nb\n");
    }

    #[test]
    fn no_multiple_empty_lines() {
        assert_eq!(format("a\n\n\nb\n"), "a\n\nb\n");
        assert_eq!(format("a\n\n  \n\t\nb\n"), "a\n\nb\n");
        assert_eq!(format("\n\na\n"), "a\n");
        assert_eq!(format("a\n\nb\n"), "a\n\nb\n");
    }

    #[test]
    fn line_endings() {
        assert_eq!(format("a\r\nb\r\n"), "a\nb\n");
        assert_eq!(format("a  \r\n\r\n\r\nb"), "a\n\nb\n");
        assert_eq!(format("const a = `x\r\ny`\r\n"), "const a = `x\ny`\n");
    }

    #[test]
    fn jsx_text() {
        assert_eq!(format("const a = <div>  \n\n\n  text  \n</div>\n"), "const a = (\n    <div>\n\n        text\n    </div>\n)\n");
    }

    #[test]
    fn ignored_files() {
        assert_eq!(format("// dprint-ignore-file\n\n\na"), "// dprint-ignore-file\n\n\na");
        assert_eq!(format("// Generated\n/* eslint-disable */\n\n\na"), "// Generated\n/* eslint-disable */\n\n\na");
        assert_eq!(format("/* eslint-disable no-console */\n\n\na\n"), "/* eslint-disable no-console */\n\na\n");
    }

    #[test]
    fn template_literals() {
        assert_eq!(format("const a = `x  \n\n\n  y  `  \n"), "const a = `x  \n\n\n  y  `\n");
        assert_eq!(format("const a = `x  \n${b}  \n\n\n`\n"), "const a = `x  \n${b}  \n\n\n`\n");
        assert_eq!(format("const a = `${\n\n\nb  \n}`\n"), "const a = `${\n\nb\n}`\n");
        assert_eq!(format("const a = `x`  \n\n\nconst b = `y`\n"), "const a = `x`\n\nconst b = `y`\n");
    }
}
