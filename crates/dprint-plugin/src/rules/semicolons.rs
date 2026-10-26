//! `semi`: no semicolons at the end of statements.
//!
//! Where the next line starts with something that would otherwise continue the statement, such as `(` or `[`,
//! the semicolon moves to the start of that line: `;(a as B).run()`.

use std::collections::HashSet;

use oxc_ast::ast::*;
use oxc_ast_visit::Visit;
use oxc_ast_visit::walk;
use oxc_parser::Kind;
use oxc_span::GetSpan;
use oxc_span::Span;

use crate::edits::Edits;
use crate::source::Source;
use crate::source::Tokens;
use crate::source::Token;

pub fn run(source: &Source, edits: &mut Edits) {
    let text = source.text;
    let mut context = Context { tokens: &source.tokens, kept: HashSet::new() };
    context.visit_program(source.program);

    for (index, semicolon) in source.tokens.iter().enumerate() {
        if semicolon.kind != Kind::Semicolon || context.kept.contains(&semicolon.start) {
            continue;
        }

        let previous = index.checked_sub(1).map(|index| source.tokens[index]);
        let next = source.tokens.get(index + 1);

        let leading = text[..semicolon.start].rsplit('\n').next().is_some_and(|before| before.trim().is_empty());

        // `a(); b()` needs it, `{ a(); }` doesn't.
        let ends_line = next.is_none_or(|next| text[semicolon.end..next.start].contains('\n'));
        if !ends_line && !leading && next.is_some_and(|next| next.kind != Kind::RCurly) {
            continue;
        }

        // In a class, `get;` followed by a method would turn into a getter.
        if previous.is_some_and(|previous| is_modifier(previous.kind)) {
            continue;
        }

        match next.filter(|next| continues_statement(next.kind)) {
            Some(next) => {
                if !leading {
                    edits.delete(semicolon.start, semicolon.end);
                    edits.replace(next.start, next.start, ";");
                }
            }
            None => edits.delete(semicolon.start, semicolon.end),
        }
    }
}

/// Tokens that, at the start of a line, would continue the statement on the line before.
fn continues_statement(kind: Kind) -> bool {
    use Kind::*;
    matches!(kind, LParen | LBrack | NoSubstitutionTemplate | TemplateHead | Plus | Minus | Star | Slash | SlashEq | RegExp | LAngle | In | Instanceof)
}

fn is_modifier(kind: Kind) -> bool {
    use Kind::*;
    matches!(kind, Get | Set | Static | Accessor | Declare | Abstract | Override | Readonly | Async | Public | Private | Protected)
}

struct Context<'s> {
    tokens: &'s [Token],
    /// Semicolons that aren't statement ends, or that stand for an empty statement which must stay.
    kept: HashSet<usize>,
}

impl Context<'_> {
    fn keep(&mut self, start: u32, end: u32) {
        let from = self.tokens.index_at(start);
        let semicolons = self.tokens[from..].iter().take_while(|token| token.start < end as usize).filter(|token| token.kind == Kind::Semicolon);
        self.kept.extend(semicolons.map(|token| token.start));
    }

    /// `if (a);` and `while (a);`: the semicolon is the whole body.
    fn keep_body(&mut self, body: &Statement) {
        if let Statement::EmptyStatement(empty) = body {
            self.kept.insert(empty.span.start as usize);
        }
    }

    fn keep_span(&mut self, span: Span) {
        self.keep(span.start, span.end);
    }
}

impl<'a> Visit<'a> for Context<'_> {
    fn visit_for_statement(&mut self, it: &ForStatement<'a>) {
        self.keep(it.span.start, it.body.span().start);
        self.keep_body(&it.body);
        walk::walk_for_statement(self, it);
    }

    fn visit_for_in_statement(&mut self, it: &ForInStatement<'a>) {
        self.keep_body(&it.body);
        walk::walk_for_in_statement(self, it);
    }

    fn visit_for_of_statement(&mut self, it: &ForOfStatement<'a>) {
        self.keep_body(&it.body);
        walk::walk_for_of_statement(self, it);
    }

    fn visit_while_statement(&mut self, it: &WhileStatement<'a>) {
        self.keep_body(&it.body);
        walk::walk_while_statement(self, it);
    }

    fn visit_do_while_statement(&mut self, it: &DoWhileStatement<'a>) {
        self.keep_body(&it.body);
        walk::walk_do_while_statement(self, it);
    }

    fn visit_if_statement(&mut self, it: &IfStatement<'a>) {
        self.keep_body(&it.consequent);
        if let Some(alternate) = &it.alternate {
            self.keep_body(alternate);
        }
        walk::walk_if_statement(self, it);
    }

    fn visit_labeled_statement(&mut self, it: &LabeledStatement<'a>) {
        self.keep_body(&it.body);
        walk::walk_labeled_statement(self, it);
    }

    fn visit_with_statement(&mut self, it: &WithStatement<'a>) {
        self.keep_body(&it.body);
        walk::walk_with_statement(self, it);
    }

    // Members of interfaces and type literals are separated by the `commas` rule.

    fn visit_ts_interface_body(&mut self, it: &TSInterfaceBody<'a>) {
        self.keep_span(it.span);
        walk::walk_ts_interface_body(self, it);
    }

    fn visit_ts_type_literal(&mut self, it: &TSTypeLiteral<'a>) {
        self.keep_span(it.span);
        walk::walk_ts_type_literal(self, it);
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
    fn statements() {
        assert_eq!(format("const a = 1;\nfoo();\nreturn_();\n"), "const a = 1\nfoo()\nreturn_()\n");
        assert_eq!(format("import a from \"a\";\nexport { a };\ntype B = string;\n"), "import a from \"a\"\nexport { a }\ntype B = string\n");
        assert_eq!(format("function f() { return 1; }\n"), "function f() {\n    return 1\n}\n");
        assert_eq!(format("class A { a = 1; b(): void {}; }\n"), "class A { a = 1; b(): void {} }\n");
        assert_eq!(format("class A {\n    a = 1;\n    b = 2;\n}\n"), "class A {\n    a = 1\n    b = 2\n}\n");
        assert_eq!(format("do {} while (a);\n"), "do {} while (a)\n");
    }

    #[test]
    fn kept() {
        assert_eq!(format("a(); b()\n"), "a()\nb()\n");
        assert_eq!(format("for (let i = 0; i < 1; i++) {}\nfor (;;) {}\n"), "for (let i = 0; i < 1; i++) {}\nfor (;;) {}\n");
        assert_eq!(format("if (a);\nwhile (b);\n"), "if (a);\nwhile (b);\n");
        assert_eq!(format("class A {\n    get;\n    b() {}\n}\n"), "class A {\n    get;\n    b() {}\n}\n");
    }

    #[test]
    fn moved_to_the_next_line() {
        assert_eq!(format("const a = b;\n(c as D).run();\n"), "const a = b\n;(c as D).run()\n");
        assert_eq!(format("const a = b;\n[c].map(d);\nconst e = f;\n`g`.trim();\n"), "const a = b\n;[c].map(d)\nconst e = f\n;`g`.trim()\n");
        assert_eq!(format("const a = b; // note\n\n(c).run()\n"), "const a = b // note\n\n;(c).run()\n");
        assert_eq!(format("a()\n;(b)()\n"), "a()\n;(b)()\n");
        assert_eq!(format("class A {\n    a = 1;\n    [b] = 2;\n    *c() {}\n}\n"), "class A {\n    a = 1\n    ;[b] = 2\n    ;*c() {}\n}\n");
    }

    #[test]
    fn stray() {
        assert_eq!(format("a();\n;b()\n"), "a()\nb()\n");
        assert_eq!(format("function f() {};\n"), "function f() {}\n");
    }
}
