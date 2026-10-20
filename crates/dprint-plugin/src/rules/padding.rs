//! `padded-blocks`, extended to every pair of braces, brackets and parentheses: no blank lines directly
//! after an opening `{`, `[` or `(`, or directly before a closing `}`, `]` or `)`.
//!
//! Blank lines elsewhere inside are kept, so members can still be grouped.

use oxc_parser::Kind;

use crate::edits::Edits;
use crate::source::Source;

pub fn run(source: &Source, edits: &mut Edits) {
    let text = source.text;

    for token in &source.tokens {
        match token.kind {
            Kind::LCurly | Kind::LBrack | Kind::LParen => {
                let rest = &text[token.end..];
                let length = rest.find(|character: char| !character.is_whitespace()).unwrap_or(rest.len());
                strip_blank_lines(text, token.end, token.end + length, edits);
            }
            Kind::RCurly | Kind::RBrack | Kind::RParen => {
                let start = text[..token.start].rfind(|character: char| !character.is_whitespace()).map_or(0, |index| index + 1);
                // An empty pair was already handled from its opening side.
                if !matches!(text[..start].chars().next_back(), Some('{' | '[' | '(')) {
                    strip_blank_lines(text, start, token.start, edits);
                }
            }
            _ => {}
        }
    }
}

/// Reduces the whitespace in `start..end` to a single line break, keeping the indentation that follows it.
fn strip_blank_lines(text: &str, start: usize, end: usize, edits: &mut Edits) {
    let whitespace = &text[start..end];
    let (Some(first), Some(last)) = (whitespace.find('\n'), whitespace.rfind('\n')) else { return };
    if first != last {
        edits.delete(start + first + 1, start + last + 1);
    }
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
    fn blocks() {
        assert_eq!(format("function f() {\n\n    a()\n\n    b()\n\n}\n"), "function f() {\n    a()\n\n    b()\n}\n");
        assert_eq!(format("if (a) {\n  \n    b()\n\t\n}\n"), "if (a) {\n    b()\n}\n");
        assert_eq!(format("class A {\n\n    a = 1\n\n}\n"), "class A {\n    a = 1\n}\n");
        assert_eq!(format("switch (a) {\n\n    case 1: break\n\n}\n"), "switch (a) {\n    case 1: break\n}\n");
    }

    #[test]
    fn literals_and_types() {
        assert_eq!(format("const a = {\n\n    b: 1,\n\n    c: 2,\n\n}\n"), "const a = {\n    b: 1,\n\n    c: 2,\n}\n");
        assert_eq!(format("const a = [\n\n    1,\n\n    2,\n\n]\n"), "const a = [\n    1,\n\n    2,\n]\n");
        assert_eq!(format("interface A {\n\n    b: string\n\n}\n"), "interface A {\n    b: string\n}\n");
        assert_eq!(format("type A = {\n\n    b: string\n\n}\n"), "type A = {\n    b: string\n}\n");
        assert_eq!(format("import {\n\n    a,\n\n} from \"a\"\n"), "import {\n    a,\n} from \"a\"\n");
    }

    #[test]
    fn parentheses() {
        assert_eq!(format("foo(\n\n    a,\n\n    b,\n\n)\n"), "foo(\n    a,\n\n    b,\n)\n");
        assert_eq!(format("function f(\n\n    a: string,\n\n) {}\n"), "function f(\n    a: string,\n) {}\n");
        assert_eq!(format("const a = (\n\n    b + c\n\n)\n"), "const a = (\n    b + c\n)\n");
        assert_eq!(format("foo(\n\n)\n"), "foo(\n)\n");
    }

    #[test]
    fn comments() {
        assert_eq!(format("function f() {\n\n    // first\n\n    a()\n    // last\n\n}\n"), "function f() {\n    // first\n\n    a()\n    // last\n}\n");
    }

    #[test]
    fn single_line_and_empty() {
        assert_eq!(format("const a = { b: 1 }\nconst c = []\nfunction f() {}\n"), "const a = { b: 1 }\nconst c = []\nfunction f() {}\n");
        assert_eq!(format("function f() {\n\n}\n"), "function f() {\n}\n");
    }

    #[test]
    fn template_literals() {
        assert_eq!(format("const a = `{\n\n${b}\n\n}`\n"), "const a = `{\n\n${b}\n\n}`\n");
        assert_eq!(format("const a = `${{\n\n    b,\n\n}}`\n"), "const a = `${{\n    b,\n}}`\n");
    }

    #[test]
    fn jsx() {
        assert_eq!(format("const a = (\n    <div>\n        {\n\n            b\n\n        }\n    </div>\n)\n"), "const a = (\n    <div>\n        {\n            b\n        }\n    </div>\n)\n");
    }
}
