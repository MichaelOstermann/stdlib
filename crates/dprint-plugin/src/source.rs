use std::path::Path;

use anyhow::Result;
use anyhow::bail;
use oxc_allocator::Allocator;
use oxc_ast::ast::Program;
use oxc_parser::Kind;
use oxc_parser::Parser;
use oxc_parser::config::TokensParserConfig;
use oxc_span::SourceType;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Token {
    pub kind: Kind,
    pub start: usize,
    pub end: usize,
}

impl Token {
    /// Template literal text, where whitespace and line breaks are part of the string.
    pub fn is_template(&self) -> bool {
        matches!(self.kind, Kind::NoSubstitutionTemplate | Kind::TemplateHead | Kind::TemplateMiddle | Kind::TemplateTail)
    }
}

/// A byte offset: `u32` in the spans of the syntax tree, `usize` in tokens and text.
pub trait Offset {
    fn offset(self) -> usize;
}

impl Offset for u32 {
    fn offset(self) -> usize {
        self as usize
    }
}

impl Offset for usize {
    fn offset(self) -> usize {
        self
    }
}

/// Lookups by byte offset in the tokens of a file, which are in source order.
pub trait Tokens {
    /// The index of the first token that starts at or after `offset`.
    fn index_at(&self, offset: impl Offset) -> usize;
    /// The first token that starts at or after `offset`.
    fn at(&self, offset: impl Offset) -> Option<Token>;
    /// The last token that ends at or before `offset`.
    fn before(&self, offset: impl Offset) -> Option<Token>;
}

impl Tokens for [Token] {
    fn index_at(&self, offset: impl Offset) -> usize {
        let offset = offset.offset();
        self.partition_point(|token| token.start < offset)
    }

    fn at(&self, offset: impl Offset) -> Option<Token> {
        self.get(self.index_at(offset)).copied()
    }

    fn before(&self, offset: impl Offset) -> Option<Token> {
        let offset = offset.offset();
        let index = self.partition_point(|token| token.end <= offset);
        index.checked_sub(1).map(|index| self[index])
    }
}

/// A token or a comment: everything in a file that isn't whitespace.
#[derive(Clone, Copy, Debug)]
pub struct Item {
    /// `None` for a comment.
    pub kind: Option<Kind>,
    pub start: usize,
    pub end: usize,
}

/// A parsed file, as the rules see it.
pub struct Source<'a> {
    pub text: &'a str,
    pub tokens: Vec<Token>,
    pub program: &'a Program<'a>,
}

impl Source<'_> {
    /// Tokens and comments in source order.
    pub fn items(&self) -> Vec<Item> {
        let tokens = self.tokens.iter().map(|token| Item { kind: Some(token.kind), start: token.start, end: token.end });
        let comments = self.program.comments.iter().map(|comment| Item { kind: None, start: comment.span.start as usize, end: comment.span.end as usize });
        let mut items: Vec<Item> = tokens.chain(comments).collect();
        items.sort_by_key(|item| item.start);
        items
    }
}

/// Parses `text` and hands it to `run`, failing if it doesn't parse: the rules rely on a correct AST.
pub fn with_source<T>(path: &Path, text: &str, run: impl FnOnce(&Source) -> T) -> Result<T> {
    let Ok(source_type) = SourceType::from_path(path) else {
        bail!("Unsupported file type: {}", path.display());
    };

    let allocator = Allocator::default();
    let parsed = Parser::new(&allocator, text, source_type).with_config(TokensParserConfig).parse();

    if let Some(error) = parsed.diagnostics.iter().next() {
        bail!("{}: {error}", path.display());
    }

    let tokens = parsed.tokens.iter().map(|token| Token { kind: token.kind(), start: token.start() as usize, end: token.end() as usize }).collect();

    Ok(run(&Source { text, tokens, program: &parsed.program }))
}

pub fn tokenize(path: &Path, text: &str) -> Result<Vec<Token>> {
    with_source(path, text, |source| source.tokens.clone())
}
