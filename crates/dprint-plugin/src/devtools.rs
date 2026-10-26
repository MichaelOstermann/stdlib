//! Helpers for testing the formatter against other tools. Not part of the plugin.

use std::path::Path;

use anyhow::Result;
use oxc_parser::Kind;

use crate::rules::indent::inside;
use crate::rules::indent::literals;
use crate::source::tokenize;
use crate::source::with_source;
use crate::verify::verify_tokens;

/// Removes all indentation, apart from lines inside template literals and the inner lines of block
/// comments, which keep their position relative to the comment's first line. Formatting the result must
/// give the same output as formatting the original.
pub fn flatten_indentation(path: &Path, text: &str) -> Result<String> {
    with_source(path, text, |source| {
        let items = source.items();
        let literals = literals(&items);
        let comments: Vec<_> = items.iter().filter(|item| item.kind.is_none()).collect();
        let mut output = String::with_capacity(text.len());
        let mut line_start = 0;

        for line in text.split_inclusive('\n') {
            let indent = line.len() - line.trim_start_matches([' ', '\t']).len();
            let in_literal = inside(&literals, line_start, |span| span).is_some();
            let comment = inside(&comments, line_start, |comment| (comment.start, comment.end));

            let removed = match comment {
                _ if in_literal => 0,
                Some(comment) => indent.min(text[..comment.start].rsplit('\n').next().map_or(0, str::len)),
                None => indent,
            };
            output.push_str(&line[removed..]);
            line_start += line.len();
        }

        output
    })
}

/// Scrambles the spacing between tokens on the same line without changing the tokens, so the result can be
/// handed to both this formatter and another one to compare what they make of it.
pub fn scramble_spacing(path: &Path, text: &str, seed: u64) -> Result<String> {
    let scrambled = with_source(path, text, |source| {
        let items = source.items();
        let mut state = seed;
        let mut output = String::with_capacity(text.len());
        let mut position = 0;

        for pair in items.windows(2) {
            let (left, right) = (&pair[0], &pair[1]);
            let gap = &text[left.end..right.start];

            // Spacing next to these is significant, or removing it could glue two tokens into another one.
            let fragile = |kind: Option<Kind>| kind.is_none_or(|kind| kind.is_number() || matches!(kind, Kind::JSXText | Kind::RegExp | Kind::LAngle | Kind::RAngle | Kind::Slash));
            if !gap.bytes().all(|byte| byte == b' ') || fragile(left.kind) || fragile(right.kind) {
                continue;
            }

            let is_word = |character: Option<char>| character.is_some_and(|character| character.is_alphanumeric() || matches!(character, '_' | '$' | '#' | '@'));
            let (before, after) = (text[..left.end].chars().next_back(), text[right.start..].chars().next());
            let is_bracket = |character: Option<char>| character.is_some_and(|character| "()[]{},;".contains(character));
            // Two words would merge, and so could two operators: `a + +b`, `a = >b`.
            let separable = is_bracket(before) || is_bracket(after) || (is_word(before) != is_word(after) && before != Some('.') && after != Some('.'));

            state = state.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
            let choice = (state >> 33) as usize % 6;
            let replacement = match choice {
                0 if separable => "",
                1 if !gap.is_empty() || separable => " ",
                2 if !gap.is_empty() || separable => "  ",
                _ => continue,
            };

            output.push_str(&text[position..left.end]);
            output.push_str(replacement);
            position = right.start;
        }

        output.push_str(&text[position..]);
        output
    })?;

    verify_tokens(path, text, &tokenize(path, text)?, &scrambled, crate::verify::Extra::None)?;
    Ok(scrambled)
}
