use std::borrow::Cow;
use std::path::Path;

use anyhow::Result;

use crate::Configuration;
use crate::edits::Edits;
use crate::rules;
use crate::source::Source;
use crate::source::tokenize;
use crate::source::with_source;
use crate::verify::Extra;
use crate::verify::verify_ast;
use crate::verify::verify_jsx;
use crate::verify::verify_rewritten;
use crate::verify::verify_sorted;
use crate::verify::verify_tokens;

/// How a pass's output is checked against its input before it is accepted.
enum Check {
    /// The tokens are the same, apart from quotes, semicolons and commas.
    Tokens,
    /// The same, and braces around statements may come and go.
    Braces,
    /// The same tokens, apart from parentheses.
    Parens,
    /// The same tokens in another order. The pass is repeated until it has nothing left to move.
    Sorted,
    /// A function was declared another way, or a duplicate import dropped.
    Rewritten,
    /// JSX renders the same text, however its children are laid out.
    Jsx,
    /// The tokens differ, but the syntax tree is the same, parentheses aside.
    Ast,
}

/// Each pass sees the output of the one before it, so rules in different passes never produce conflicting edits.
/// `lines` runs last to tidy up whatever the earlier passes inserted or removed.
const PASSES: [(fn(&Source, &mut Edits), Check); 23] = [
    (rules::parens::run, Check::Ast),
    (rules::parens::functions, Check::Parens),
    (rules::rewrites::functions, Check::Rewritten),
    (rules::rewrites::dedupe, Check::Rewritten),
    (rules::literals::run, Check::Tokens),
    (rules::quotes::run, Check::Tokens),
    (rules::operators::run, Check::Tokens),
    (rules::breaks::run, Check::Tokens),
    (rules::breaks::unions, Check::Ast),
    (rules::blocks::run, Check::Braces),
    (rules::jsx::layout, Check::Jsx),
    (rules::jsx::parentheses, Check::Ast),
    // Wrapping JSX can put the first argument of a call on a new line, which decides for the rest.
    (rules::breaks::run, Check::Tokens),
    (rules::semicolons::run, Check::Tokens),
    (rules::commas::run, Check::Tokens),
    (rules::sort::run, Check::Sorted),
    // A multi-line member may have moved in front of another one.
    (rules::class_members::run, Check::Tokens),
    (rules::comments::run, Check::Tokens),
    (rules::class_members::run, Check::Tokens),
    (rules::spacing::run, Check::Tokens),
    (rules::padding::run, Check::Tokens),
    (rules::indent::run, Check::Tokens),
    (rules::lines::run, Check::Tokens),
];

const MAX_NESTING: usize = 32;

/// Formats `text`, returning `None` when it is already formatted.
pub fn format_text(path: &Path, text: &str, _config: &Configuration) -> Result<Option<String>> {
    if path.extension().is_some_and(|extension| extension == "json" || extension == "jsonc") {
        return crate::json::format_json(path, text);
    }

    let first_token = tokenize(path, text)?.first().map_or(text.len(), |token| token.start);
    if is_ignored(&text[..first_token]) {
        return Ok(None);
    }

    let mut formatted = Cow::Borrowed(text);
    for (pass, check) in PASSES {
        // Sorting handles one level of nesting at a time.
        let rounds = if matches!(check, Check::Sorted) { MAX_NESTING } else { 1 };
        for _ in 0..rounds {
            let edited = with_source(path, &formatted, |source| {
                let mut edits = Edits::default();
                pass(source, &mut edits);
                (!edits.is_empty()).then(|| (edits.apply(source.text), source.tokens.clone()))
            })?;

            let Some((edited, tokens)) = edited else { break };
            match check {
                Check::Tokens => verify_tokens(path, &formatted, &tokens, &edited, Extra::None)?,
                Check::Braces => verify_tokens(path, &formatted, &tokens, &edited, Extra::Braces)?,
                Check::Parens => verify_tokens(path, &formatted, &tokens, &edited, Extra::Parens)?,
                Check::Sorted => verify_sorted(path, &formatted, &edited)?,
                Check::Rewritten => verify_rewritten(path, &formatted, &tokens, &edited)?,
                Check::Jsx => verify_jsx(path, &formatted, &tokens, &edited)?,
                Check::Ast => verify_ast(path, &formatted, &edited)?,
            }
            formatted = Cow::Owned(edited);
        }
    }

    match formatted {
        Cow::Borrowed(_) => Ok(None),
        Cow::Owned(formatted) => Ok(Some(formatted)),
    }
}

/// Whether the comments before the first token opt the file out, as generated files do.
fn is_ignored(header: &str) -> bool {
    if header.contains("dprint-ignore-file") {
        return true;
    }

    let mut rest = header;
    while let Some(start) = rest.find("/*") {
        let Some(length) = rest[start..].find("*/") else { break };
        if matches!(rest[start + 2..start + length].trim(), "eslint-disable" | "oxlint-disable") {
            return true;
        }
        rest = &rest[start + length + 2..];
    }
    false
}
