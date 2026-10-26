//! `padded-blocks`, extended to every pair of braces, brackets and parentheses: no blank lines directly
//! after an opening `{`, `[` or `(`, or directly before a closing `}`, `]` or `)`.
//!
//! Between the members of objects, object types, arrays, tuples, enums, destructuring and the braces of an
//! `import` or `export` there are no blank lines either. Blank lines elsewhere inside are kept, so statements,
//! class members and arguments can still be grouped.

use oxc_ast::ast::*;
use oxc_ast_visit::Visit;
use oxc_ast_visit::walk;
use oxc_parser::Kind;
use oxc_span::GetSpan;
use oxc_span::Span;

use crate::edits::Edits;
use crate::source::Source;

pub fn run(source: &Source, edits: &mut Edits) {
    let text = source.text;
    let comments = source.program.comments.iter().map(|comment| comment.span).collect();
    Members { text, comments, edits: &mut *edits }.visit_program(source.program);

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

struct Members<'s> {
    text: &'s str,
    comments: Vec<Span>,
    edits: &'s mut Edits,
}

impl Members<'_> {
    /// Strips the blank lines between each member and the next, around the comma and comments between them.
    fn list(&mut self, members: impl Iterator<Item = Span>) {
        let members: Vec<Span> = members.collect();
        for pair in members.windows(2) {
            let (gap_start, end) = (pair[0].end as usize, pair[1].start as usize);
            let comments = self.comments.iter().filter(|comment| gap_start <= comment.start as usize && comment.end as usize <= end);
            let comments: Vec<(usize, usize)> = comments.map(|comment| (comment.start as usize, comment.end as usize)).collect();
            // The whitespace runs between the comma and the comments: what is inside a comment stays.
            let mut start = gap_start;
            for comment in comments.into_iter().chain([(end, end)]) {
                let mut from = start;
                for (offset, character) in self.text[start..comment.0].char_indices() {
                    if !character.is_whitespace() {
                        strip_blank_lines(self.text, from, start + offset, self.edits);
                        from = start + offset + character.len_utf8();
                    }
                }
                strip_blank_lines(self.text, from, comment.0, self.edits);
                start = comment.1;
            }
        }
    }
}

impl<'a> Visit<'a> for Members<'_> {
    fn visit_object_expression(&mut self, it: &ObjectExpression<'a>) {
        self.list(it.properties.iter().map(GetSpan::span));
        walk::walk_object_expression(self, it);
    }

    fn visit_ts_interface_body(&mut self, it: &TSInterfaceBody<'a>) {
        self.list(it.body.iter().map(GetSpan::span));
        walk::walk_ts_interface_body(self, it);
    }

    fn visit_ts_type_literal(&mut self, it: &TSTypeLiteral<'a>) {
        self.list(it.members.iter().map(GetSpan::span));
        walk::walk_ts_type_literal(self, it);
    }

    fn visit_array_expression(&mut self, it: &ArrayExpression<'a>) {
        self.list(it.elements.iter().map(GetSpan::span));
        walk::walk_array_expression(self, it);
    }

    fn visit_ts_tuple_type(&mut self, it: &TSTupleType<'a>) {
        self.list(it.element_types.iter().map(GetSpan::span));
        walk::walk_ts_tuple_type(self, it);
    }

    fn visit_ts_enum_body(&mut self, it: &TSEnumBody<'a>) {
        self.list(it.members.iter().map(|member| member.span));
        walk::walk_ts_enum_body(self, it);
    }

    fn visit_object_pattern(&mut self, it: &ObjectPattern<'a>) {
        self.list(it.properties.iter().map(|property| property.span).chain(it.rest.as_ref().map(|rest| rest.span)));
        walk::walk_object_pattern(self, it);
    }

    fn visit_array_pattern(&mut self, it: &ArrayPattern<'a>) {
        self.list(it.elements.iter().flatten().map(GetSpan::span).chain(it.rest.as_ref().map(|rest| rest.span)));
        walk::walk_array_pattern(self, it);
    }

    fn visit_import_declaration(&mut self, it: &ImportDeclaration<'a>) {
        if let Some(specifiers) = &it.specifiers {
            self.list(specifiers.iter().map(GetSpan::span));
        }
        walk::walk_import_declaration(self, it);
    }

    fn visit_export_named_declaration(&mut self, it: &ExportNamedDeclaration<'a>) {
        self.list(it.specifiers.iter().map(|specifier| specifier.span));
        walk::walk_export_named_declaration(self, it);
    }

    fn visit_export_from_declaration(&mut self, it: &ExportFromDeclaration<'a>) {
        self.list(it.specifiers.iter().map(|specifier| specifier.span));
        walk::walk_export_from_declaration(self, it);
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
    use crate::testing::format_tsx as format;

    #[test]
    fn blocks() {
        assert_eq!(format("function f() {\n\n    a()\n\n    b()\n\n}\n"), "function f() {\n    a()\n\n    b()\n}\n");
        assert_eq!(format("if (a) {\n  \n    b()\n\t\n}\n"), "if (a) {\n    b()\n}\n");
        assert_eq!(format("class A {\n\n    a = 1\n\n}\n"), "class A {\n    a = 1\n}\n");
        assert_eq!(format("switch (a) {\n\n    case 1: break\n\n}\n"), "switch (a) {\n    case 1: break\n}\n");
    }

    #[test]
    fn literals_and_types() {
        assert_eq!(format("const a = {\n\n    b: 1,\n\n    c: 2,\n\n}\n"), "const a = {\n    b: 1,\n    c: 2,\n}\n");
        assert_eq!(format("const a = [\n\n    1,\n\n    2,\n\n]\n"), "const a = [\n    1,\n    2,\n]\n");
        assert_eq!(format("interface A {\n\n    b: string\n\n}\n"), "interface A {\n    b: string\n}\n");
        assert_eq!(format("type A = {\n\n    b: string\n\n}\n"), "type A = {\n    b: string\n}\n");
        assert_eq!(format("import {\n\n    a,\n\n} from \"a\"\n"), "import {\n    a,\n} from \"a\"\n");
    }

    #[test]
    fn between_members() {
        assert_eq!(format("interface A {\n    a?: B[]\n\n    b: string\n\n\n    c(): void\n}\n"), "interface A {\n    a?: B[]\n    b: string\n    c(): void\n}\n");
        assert_eq!(format("const a = {\n    b: 1,\n\n    /** About c. */\n\n    c() {},\n}\n"), "const a = {\n    b: 1,\n    /** About c. */\n    c() {},\n}\n");
        assert_eq!(format("const {\n    a,\n\n    ...b\n} = c\nconst [\n    d,\n\n    e,\n] = f\n"), "const {\n    a,\n    ...b\n} = c\nconst [\n    d,\n    e,\n] = f\n");
        assert_eq!(format("enum A {\n    B,\n\n    C,\n}\ntype D = [\n    string,\n\n    number,\n]\n"), "enum A {\n    B,\n    C,\n}\ntype D = [\n    string,\n    number,\n]\n");
        assert_eq!(format("import {\n    a,\n\n    b,\n} from \"a\"\nexport {\n    a,\n\n    b,\n}\n"), "import {\n    a,\n    b,\n} from \"a\"\nexport {\n    a,\n    b,\n}\n");
        // What is inside a comment stays, and so do the groups of statements, class members and arguments.
        assert_eq!(format("const a = {\n    b: 1,\n    /*\n\n    */\n    c: 2,\n}\n"), "const a = {\n    b: 1,\n    /*\n\n    */\n    c: 2,\n}\n");
        assert_eq!(format("class A {\n    a = 1\n\n    b = 2\n}\nfoo(\n    a,\n\n    b,\n)\n"), "class A {\n    a = 1\n\n    b = 2\n}\nfoo(\n    a,\n\n    b,\n)\n");
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
