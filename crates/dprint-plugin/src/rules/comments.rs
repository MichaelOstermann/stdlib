//! `spaced-comment`: a space after `//` and inside `/* */`.
//!
//! `///` and `/*!` count as openers, and runs of `/`, `#` and `*` are left alone so that dividers
//! and JSDoc blocks keep their shape.

use crate::edits::Edits;
use crate::source::Source;

pub fn run(source: &Source, edits: &mut Edits) {
    for comment in &source.program.comments {
        let (start, end) = (comment.span.start as usize, comment.span.end as usize);
        let text = &source.text[start..end];

        if let Some(content) = text.strip_prefix("//") {
            let marker = usize::from(content.starts_with('/'));
            let rest = &content[marker..];
            let divider = rest.chars().all(|character| matches!(character, '/' | '#'));
            if !divider && !rest.starts_with(char::is_whitespace) {
                edits.replace(start + 2 + marker, start + 2 + marker, " ");
            }
        }
        else if let Some(content) = text.strip_prefix("/*").and_then(|text| text.strip_suffix("*/")) {
            // `/*!` and the stars of `/**` and `/*****` belong to the opener, and trailing stars to the closer.
            let marker = usize::from(content.starts_with('!'));
            let opener = marker + content[marker..].chars().take_while(|&character| character == '*').count();
            let closer = content.len() - content.chars().rev().take_while(|&character| character == '*').count();
            if opener >= closer {
                continue;
            }

            let body = &content[opener..closer];
            if !body.starts_with(char::is_whitespace) {
                edits.replace(start + 2 + opener, start + 2 + opener, " ");
            }
            if !body.ends_with(char::is_whitespace) {
                edits.replace(start + 2 + closer, start + 2 + closer, " ");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use crate::Configuration;
    use crate::format_text;

    fn format(text: &str) -> String {
        format_text(Path::new("test.ts"), text, &Configuration::default()).unwrap().unwrap_or_else(|| text.to_string())
    }

    #[test]
    fn line_comments() {
        assert_eq!(format("//a\n// b\n///c\n/// <reference path=\"x\" />\n"), "// a\n// b\n/// c\n/// <reference path=\"x\" />\n");
        assert_eq!(format("//#region d\n//!e\n//-----\nconst z = 1 //p\n"), "// #region d\n// !e\n// -----\nconst z = 1 // p\n");
        assert_eq!(format("////\n//####\n//\n"), "////\n//####\n//\n");
    }

    #[test]
    fn block_comments() {
        assert_eq!(format("/*f*/\n/* g*/\n/*h */\n"), "/* f */\n/* g */\n/* h */\n");
        assert_eq!(format("/**i*/\n/** j */\n/*!l*/\n/*! m */\n"), "/** i */\n/** j */\n/*! l */\n/*! m */\n");
        assert_eq!(format("/**\n * k\n */\n/***/\n/**/\n/*****\n n\n *****/\n"), "/**\n * k\n */\n/***/\n/**/\n/*****\n n\n *****/\n");
        assert_eq!(format("/*\no*/\n"), "/*\no */\n");
    }
}
