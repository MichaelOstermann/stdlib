use std::path::Path;

use anyhow::Result;
use anyhow::bail;
use oxc_allocator::Allocator;
use oxc_parser::Kind;
use oxc_parser::ParseOptions;
use oxc_parser::Parser;
use oxc_span::ContentEq;
use oxc_span::SourceType;

use crate::source::Token;
use crate::source::tokenize;
use crate::source::with_source;

/// Tokens a pass may add and remove on top of semicolons and commas.
#[derive(Clone, Copy)]
pub enum Extra {
    None,
    /// Curly braces and `return`, for the rules that decide whether a body is wrapped in a block.
    Braces,
    /// Parentheses, for the rules about functions used as values.
    Parens,
}

/// Guards against formatter bugs: the output must lex to the same tokens as the input, apart from the
/// punctuation the rules are allowed to add and remove, and the quotes around strings.
///
/// With `braces`, curly braces and `return` may be added and removed too, for the rules that decide whether
/// the body of an `if` or of an arrow function is wrapped in braces.
pub fn verify_tokens(path: &Path, before: &str, before_tokens: &[Token], after: &str, extra: Extra) -> Result<()> {
    let allowed = |kind: Kind| match extra {
        Extra::None => false,
        Extra::Braces => matches!(kind, Kind::LCurly | Kind::RCurly | Kind::Return),
        Extra::Parens => matches!(kind, Kind::LParen | Kind::RParen),
    };
    let significant = |token: &&Token| !matches!(token.kind, Kind::Semicolon | Kind::Comma) && !allowed(token.kind);
    let after_tokens = tokenize(path, after)?;
    let before_tokens: Vec<&Token> = before_tokens.iter().filter(significant).collect();
    let after_tokens: Vec<&Token> = after_tokens.iter().filter(significant).collect();

    if before_tokens.len() != after_tokens.len() {
        bail!("{}: formatting changed the number of tokens from {} to {}", path.display(), before_tokens.len(), after_tokens.len());
    }

    for (a, b) in before_tokens.iter().zip(&after_tokens) {
        let is_string = |kind: Kind| matches!(kind, Kind::Str | Kind::NoSubstitutionTemplate);
        let (a_text, b_text) = (&before[a.start..a.end], &after[b.start..b.end]);
        let same = if is_string(a.kind) && is_string(b.kind) && (a.kind == Kind::Str || b.kind == Kind::Str) {
            // A string may change its quotes, and with them which quotes are escaped.
            string_value(a_text) == string_value(b_text)
        }
        else if a.kind == Kind::Str || b.kind == Kind::Str {
            // An object key may gain or lose its quotes.
            let (string, bare) = if a.kind == Kind::Str { (a_text, b_text) } else { (b_text, a_text) };
            string[1..string.len() - 1] == *bare
        }
        else if a.kind.is_number() && b.kind.is_number() {
            // `.5` and `5.` gain a zero.
            format!("0{a_text}0").trim_matches('0') == format!("0{b_text}0").trim_matches('0')
        }
        else if a.is_template() {
            // Line endings inside a template literal are normalized, which doesn't change its value.
            a_text.replace("\r\n", "\n") == b_text
        }
        else if a.kind == Kind::JSXText {
            jsx_text(a_text) == jsx_text(b_text)
        }
        else {
            a_text == b_text
        };
        let kinds_may_differ = is_string(a.kind) || is_string(b.kind) || (a.kind.is_number() && b.kind.is_number());
        if (a.kind != b.kind && !kinds_may_differ) || !same {
            bail!("{}: formatting changed the token `{a_text}` to `{b_text}`", path.display());
        }
    }

    Ok(())
}

#[derive(Debug, PartialEq)]
enum Atom<'t> {
    /// Text as JSX renders it: JSX text, a string, or a string in braces.
    Text(String),
    Token(Kind, &'t str),
}

/// The tokens with everything that renders as text merged: `a b`, `a{" "}b` and `{"a b"}` are one atom.
fn atoms<'t>(text: &'t str, tokens: &[Token]) -> Vec<Atom<'t>> {
    let mut atoms: Vec<Atom> = Vec::with_capacity(tokens.len());
    let push_text = |atoms: &mut Vec<Atom<'t>>, value: String| match atoms.last_mut() {
        Some(Atom::Text(last)) => last.push_str(&value),
        _ if value.is_empty() => {}
        _ => atoms.push(Atom::Text(value)),
    };

    let mut index = 0;
    while let Some(token) = tokens.get(index) {
        let raw = &text[token.start..token.end];
        let braced = tokens.get(index + 1).filter(|next| token.kind == Kind::LCurly && next.kind == Kind::Str && tokens.get(index + 2).is_some_and(|close| close.kind == Kind::RCurly));
        match token.kind {
            Kind::Semicolon | Kind::Comma => {}
            Kind::JSXText => push_text(&mut atoms, jsx_text(raw)),
            Kind::Str => push_text(&mut atoms, string_value(raw)),
            _ if braced.is_some() => {
                let string = braced.expect("checked above");
                push_text(&mut atoms, string_value(&text[string.start..string.end]));
                index += 2;
            }
            _ => atoms.push(Atom::Token(token.kind, raw)),
        }
        index += 1;
    }
    atoms
}

/// For the rules that lay out JSX children: the tokens are the same and the text renders the same, however
/// it is split between JSX text and strings in braces.
pub fn verify_jsx(path: &Path, before: &str, before_tokens: &[Token], after: &str) -> Result<()> {
    let after_tokens = tokenize(path, after)?;
    let (before_atoms, after_atoms) = (atoms(before, before_tokens), atoms(after, &after_tokens));
    if let Some((a, b)) = before_atoms.iter().zip(&after_atoms).find(|(a, b)| a != b) {
        bail!("{}: formatting changed {a:?} to {b:?}", path.display());
    }
    if before_atoms.len() != after_atoms.len() {
        bail!("{}: formatting changed the number of tokens from {} to {}", path.display(), before_atoms.len(), after_atoms.len());
    }
    Ok(())
}

/// For the rules that rewrite a declaration: apart from the keywords and punctuation that say how a function
/// is declared, the output adds no token, and loses nothing but the names of a duplicate import.
pub fn verify_rewritten(path: &Path, before: &str, before_tokens: &[Token], after: &str) -> Result<()> {
    let after_tokens = tokenize(path, after)?;
    let structural = |kind: Kind| matches!(kind, Kind::Const | Kind::Eq | Kind::Arrow | Kind::Function | Kind::LCurly | Kind::RCurly | Kind::Return | Kind::Semicolon | Kind::Comma);
    let texts = |text: &'_ str, tokens: &[Token]| {
        let mut texts: Vec<(String, Kind)> = tokens.iter().filter(|token| !structural(token.kind)).map(|token| (text[token.start..token.end].to_string(), token.kind)).collect();
        texts.sort_by(|a, b| a.0.cmp(&b.0));
        texts
    };
    let (before_texts, after_texts) = (texts(before, before_tokens), texts(after, &after_tokens));

    let mut remaining = after_texts.iter().peekable();
    for (text, kind) in &before_texts {
        if remaining.peek().is_some_and(|next| next.0 == *text) {
            remaining.next();
        }
        else if !matches!(kind, Kind::Ident | Kind::As | Kind::Type | Kind::Str) {
            bail!("{}: rewriting dropped the token `{text}`", path.display());
        }
    }
    if let Some((text, _)) = remaining.next() {
        bail!("{}: rewriting added the token `{text}`", path.display());
    }
    Ok(())
}

/// For the rules that sort: the output holds the same tokens and comments as the input, in any order.
pub fn verify_sorted(path: &Path, before: &str, after: &str) -> Result<()> {
    let items = |text: &str| {
        with_source(path, text, |source| {
            let mut items: Vec<String> = source.items().iter().map(|item| text[item.start..item.end].to_string()).collect();
            items.sort_unstable();
            items
        })
    };
    if items(before)? != items(after)? {
        bail!("{}: sorting changed more than the order of the code", path.display());
    }
    Ok(())
}

/// For rules that add tokens without changing what the code means, such as the parentheses in `(a) => a`:
/// the output must parse to the same syntax tree as the input.
pub fn verify_ast(path: &Path, before: &str, after: &str) -> Result<()> {
    let Ok(source_type) = SourceType::from_path(path) else {
        bail!("Unsupported file type: {}", path.display());
    };

    let (before_allocator, after_allocator) = (Allocator::default(), Allocator::default());
    // Parentheses that only group are left out of both trees, so adding or removing them is no difference.
    let options = ParseOptions { preserve_parens: false, ..ParseOptions::default() };
    let before = Parser::new(&before_allocator, before, source_type).with_options(options).parse();
    let after = Parser::new(&after_allocator, after, source_type).with_options(options).parse();

    if let Some(error) = after.diagnostics.iter().next() {
        bail!("{}: formatting broke the syntax: {error}", path.display());
    }
    if !before.program.content_eq(&after.program) {
        bail!("{}: formatting changed the meaning of the code", path.display());
    }

    Ok(())
}

/// A string literal without its quotes and without the escapes that depend on them.
fn string_value(raw: &str) -> String {
    let mut value = String::with_capacity(raw.len());
    let mut characters = raw[1..raw.len() - 1].chars();
    while let Some(character) = characters.next() {
        if character != '\\' {
            value.push(character);
        }
        else if let Some(escaped) = characters.next() {
            if !matches!(escaped, '"' | '\'' | '`') {
                value.push('\\');
            }
            value.push(escaped);
        }
    }
    value
}

/// The value JSX gives to text: lines are trimmed and joined by a space, and blank lines are dropped.
fn jsx_text(text: &str) -> String {
    let last = text.lines().count().saturating_sub(1);
    let lines = text.lines().enumerate().map(|(index, line)| {
        let line = if index == 0 { line } else { line.trim_start_matches([' ', '\t']) };
        if index == last && !text.ends_with('\n') { line } else { line.trim_end_matches([' ', '\t']) }
    });
    lines.filter(|line| !line.is_empty()).collect::<Vec<_>>().join(" ")
}
