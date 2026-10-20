//! `quote-props` and `no-floating-decimal`.
//!
//! Object keys are unquoted unless one of them needs quotes, in which case all of them are quoted.
//! Numbers have a digit on both sides of the decimal point: `0.5` and `5.0`.

use oxc_ast::ast::*;
use oxc_ast_visit::Visit;
use oxc_ast_visit::walk;
use oxc_span::Span;

use crate::edits::Edits;
use crate::source::Source;

pub fn run(source: &Source, edits: &mut Edits) {
    for token in source.tokens.iter().filter(|token| token.kind.is_number()) {
        let raw = &source.text[token.start..token.end];
        if raw.starts_with('.') {
            edits.replace(token.start, token.start, "0");
        }
        if raw.ends_with('.') {
            edits.replace(token.end, token.end, "0");
        }
    }

    Keys { text: source.text, edits }.visit_program(source.program);
}

struct Keys<'s> {
    text: &'s str,
    edits: &'s mut Edits,
}

enum Key {
    /// `name`
    Bare(Span),
    /// `"name"`, with whether the quotes are needed.
    Quoted(Span, bool),
}

impl Keys<'_> {
    fn key(&self, key: &PropertyKey, computed: bool) -> Option<Key> {
        if computed {
            return None;
        }
        match key {
            PropertyKey::StaticIdentifier(identifier) => Some(Key::Bare(identifier.span)),
            PropertyKey::NumericLiteral(number) => is_plain_integer(&self.text[number.span.start as usize..number.span.end as usize]).then_some(Key::Bare(number.span)),
            PropertyKey::StringLiteral(string) => {
                let content = &self.text[string.span.start as usize + 1..string.span.end as usize - 1];
                // With escapes in play the quotes stay, whatever the value turns out to be.
                let needed = content != string.value.as_str() || !(is_identifier(content) || is_plain_integer(content));
                Some(Key::Quoted(string.span, needed))
            }
            _ => None,
        }
    }

    fn consistent(&mut self, keys: &[Key]) {
        let quotes_needed = keys.iter().any(|key| matches!(key, Key::Quoted(_, true)));
        for key in keys {
            match *key {
                Key::Bare(span) if quotes_needed => {
                    self.edits.replace(span.start as usize, span.start as usize, "\"");
                    self.edits.replace(span.end as usize, span.end as usize, "\"");
                }
                Key::Quoted(span, _) if !quotes_needed => {
                    self.edits.delete(span.start as usize, span.start as usize + 1);
                    self.edits.delete(span.end as usize - 1, span.end as usize);
                }
                _ => {}
            }
        }
    }

    fn signatures(&mut self, members: &[TSSignature]) {
        let keys: Vec<Key> = members
            .iter()
            .filter_map(|member| match member {
                TSSignature::TSPropertySignature(property) => self.key(&property.key, property.computed),
                TSSignature::TSMethodSignature(method) => self.key(&method.key, method.computed),
                _ => None,
            })
            .collect();
        self.consistent(&keys);
    }
}

impl<'a> Visit<'a> for Keys<'_> {
    fn visit_object_expression(&mut self, it: &ObjectExpression<'a>) {
        let keys: Vec<Key> = it
            .properties
            .iter()
            .filter_map(|property| match property {
                // A shorthand property can't be quoted, so it doesn't take part.
                ObjectPropertyKind::ObjectProperty(property) if !property.shorthand => self.key(&property.key, property.computed),
                _ => None,
            })
            .collect();
        self.consistent(&keys);
        walk::walk_object_expression(self, it);
    }

    fn visit_ts_interface_body(&mut self, it: &TSInterfaceBody<'a>) {
        self.signatures(&it.body);
        walk::walk_ts_interface_body(self, it);
    }

    fn visit_ts_type_literal(&mut self, it: &TSTypeLiteral<'a>) {
        self.signatures(&it.members);
        walk::walk_ts_type_literal(self, it);
    }
}

fn is_identifier(text: &str) -> bool {
    let mut characters = text.chars();
    characters.next().is_some_and(|first| first.is_alphabetic() || matches!(first, '_' | '$')) && characters.all(|character| character.is_alphanumeric() || matches!(character, '_' | '$'))
}

/// A number that reads the same as a key and as a string: `1` and `42`, but not `1.0`, `1e3` or `01`.
fn is_plain_integer(text: &str) -> bool {
    text.len() <= 15 && !text.is_empty() && text.bytes().all(|byte| byte.is_ascii_digit()) && (text == "0" || !text.starts_with('0'))
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
    fn unquoted_when_possible() {
        assert_eq!(format("const a = { \"b\": 1, 'c': 2, d: 3 }\n"), "const a = { b: 1, c: 2, d: 3 }\n");
        assert_eq!(format("const a = { \"1\": 1, \"default\": 2 }\n"), "const a = { 1: 1, default: 2 }\n");
        assert_eq!(format("interface A { \"b\": string, c: number }\ntype D = { \"e\"(): void }\n"), "interface A { b: string, c: number }\ntype D = { e(): void }\n");
    }

    #[test]
    fn all_quoted_when_one_needs_it() {
        assert_eq!(format("const a = { \"b-c\": 1, d: 2, 3: 4 }\n"), "const a = { \"3\": 4, \"b-c\": 1, \"d\": 2 }\n");
        assert_eq!(format("const a = { \"b c\": 1, \"d\": 2 }\n"), "const a = { \"b c\": 1, \"d\": 2 }\n");
        assert_eq!(format("const a = { \"content-type\": b, c() {}, get d() { return 1 } }\n"), "const a = { \"content-type\": b, \"c\"() {}, get \"d\"() {\n    return 1\n} }\n");
    }

    #[test]
    fn left_alone() {
        assert_eq!(format("const a = { b, \"c-d\": 1, [e]: 2, ...f }\n"), "const a = { b, \"c-d\": 1, [e]: 2, ...f }\n");
        assert_eq!(format("const a = { 1.5: 1, \"1.5\": 2, \"01\": 3 }\n"), "const a = { \"01\": 3, 1.5: 1, \"1.5\": 2 }\n");
        assert_eq!(format("const a = { b: { \"c-d\": 1 }, e: 2 }\n"), "const a = { b: { \"c-d\": 1 }, e: 2 }\n");
    }

    #[test]
    fn decimals() {
        assert_eq!(format("const a = .5\nconst b = 5.\nconst c = 0.5\nconst d = 5.0\n"), "const a = 0.5\nconst b = 5.0\nconst c = 0.5\nconst d = 5.0\n");
    }
}
