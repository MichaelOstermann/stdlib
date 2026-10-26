//! `antfu/curly`, `max-statements-per-line` and `brace-style`.
//!
//! The body of an `if`, `for` or `while` is written one of two ways: on the line of its header, `if (a) b()`,
//! or in braces on lines of its own. A body on the next line without braces gets them, and braces around a
//! body on the header's line are dropped: `if (a) { b() }` becomes `if (a) b()`. The first branch of an `if`
//! decides for the branches after it, and a branch that needs braces, because it holds several statements
//! or one that spans lines, puts all of them in braces.
//!
//! Braces mean several lines: every statement of a block and its closing brace get a line of their own.
//! Only an empty block and a block that just throws may stay on one line.
//!
//! The blocks of a `try` are written one of two ways as well: each on one line, `try { a() }`, or each
//! spread over lines. The first block decides, and a block that needs lines spreads out all of them.
//!
//! An arrow function follows from that. A body that starts on the line after its `=>` is put in braces
//! with a `return`, and a `{ return a` that starts on the line of the `=>` loses both: `() => a`.
//! `else`, `catch` and `finally` start a line.

use std::collections::HashSet;

use oxc_ast::ast::*;
use oxc_ast_visit::Visit;
use oxc_ast_visit::walk;
use oxc_parser::Kind;
use oxc_span::GetSpan;
use oxc_span::Span;

use crate::edits::Edits;
use crate::source::Source;
use crate::source::Token;
use crate::source::Tokens;

pub fn run(source: &Source, edits: &mut Edits) {
    let mut blocks = Blocks { text: source.text, tokens: &source.tokens, edits, chained: HashSet::new(), relaxed: HashSet::new(), joined: HashSet::new(), bare: HashSet::new() };
    blocks.visit_program(source.program);
}

struct Blocks<'s> {
    text: &'s str,
    tokens: &'s [Token],
    edits: &'s mut Edits,
    /// `if` statements that follow an `else`, and were handled together with the `if` before it.
    chained: HashSet<Span>,
    /// Blocks that may stay on one line: those that just throw.
    relaxed: HashSet<Span>,
    /// Blocks of a `try` that are joined onto one line.
    joined: HashSet<Span>,
    /// Blocks that are losing their braces.
    bare: HashSet<Span>,
}

#[derive(Clone, Copy, PartialEq)]
enum Form {
    /// `if (a) b()`
    Inline,
    /// The body in braces.
    Braces,
}

/// How a body is written, and whether it could be written without braces.
struct Body {
    form: Form,
    /// The statement inside the braces, if they can go.
    inner: Option<Span>,
    needs_braces: bool,
}

impl Blocks<'_> {


    fn broken(&self, start: usize, end: usize) -> bool {
        self.text[start..end].contains('\n')
    }

    fn blank(&self, start: usize, end: usize) -> bool {
        self.text[start..end].trim().is_empty()
    }

    /// Puts a break right before `end`, keeping whatever else is in the gap on the line before it.
    fn break_before(&mut self, start: usize, end: usize) {
        let gap = &self.text[start..end];
        self.edits.replace(start + gap.trim_end().len(), end, "\n");
    }

    fn classify(&self, body: &Statement) -> Body {
        let span = body.span();
        let (start, end) = (span.start as usize, span.end as usize);

        let Statement::BlockStatement(block) = body else {
            let header = self.tokens.before(start).map_or(start, |token| token.end);
            // Without braces a body belongs on the header's line, and has to fit on it.
            return Body { form: Form::Inline, inner: None, needs_braces: self.broken(header, end) };
        };
        let [statement] = block.body.as_slice() else { return Body { form: Form::Braces, inner: None, needs_braces: true } };

        // Only statements that can't change meaning, or swallow a following `else`, once the braces are gone.
        let simple = matches!(statement, Statement::ExpressionStatement(_) | Statement::ReturnStatement(_) | Statement::ThrowStatement(_) | Statement::BreakStatement(_) | Statement::ContinueStatement(_));
        let inner = statement.span();
        let commented = !self.blank(start + 1, inner.start as usize) || !self.blank(inner.end as usize, end - 1);
        if !simple || commented || self.broken(inner.start as usize, inner.end as usize) {
            return Body { form: Form::Braces, inner: None, needs_braces: true };
        }
        // Braces around a body on the header's line are noise. Around a body on its own line they are a choice.
        let form = if self.broken(start, inner.start as usize) { Form::Braces } else { Form::Inline };
        Body { form, inner: Some(inner), needs_braces: false }
    }

    /// The branches of one `if`, or the body of one loop. The flag tells whether an `else` follows the branch.
    fn curly(&mut self, branches: &[(&Statement, bool)]) {
        let bodies: Vec<Body> = branches.iter().map(|(body, _)| self.classify(body)).collect();
        let wanted = if bodies.iter().any(|body| body.needs_braces) { Form::Braces } else { bodies[0].form };

        for (&(statement, followed), body) in branches.iter().zip(&bodies) {
            let span = statement.span();
            let (start, end) = (span.start as usize, span.end as usize);
            let next = self.tokens.at(end).filter(|token| followed && token.kind == Kind::Else && self.blank(end, token.start) && !self.broken(end, token.start));
            let Some(header) = self.tokens.before(start) else { continue };
            let is_block = matches!(statement, Statement::BlockStatement(_));

            match (wanted, body.inner) {
                (Form::Braces, _) if !is_block => {
                    if !self.blank(header.end, start) {
                        // A comment between the header and its body: leave this branch as it is.
                        continue;
                    }
                    self.edits.replace(header.end, start, " {\n");
                    match next {
                        Some(next) => self.edits.replace(end, next.start, "\n}\n"),
                        None => {
                            // A comment after the statement stays on the statement's line.
                            let line_end = self.text[end..].find('\n').map_or(self.text.len(), |index| end + index);
                            let rest = self.text[end..line_end].trim();
                            let at = if rest.starts_with("//") || (rest.starts_with("/*") && rest.ends_with("*/") && rest.matches("*/").count() == 1) { line_end } else { end };
                            self.edits.replace(at, at, "\n}");
                        }
                    }
                    continue;
                }
                (Form::Inline, Some(inner)) => {
                    self.bare.insert(span);
                    self.edits.replace(header.end, inner.start as usize, " ");
                    match next {
                        Some(next) => self.edits.replace(inner.end as usize, next.start, "\n"),
                        None => self.edits.delete(inner.end as usize, end),
                    }
                    continue;
                }
                _ => {}
            }
            if let Some(next) = next {
                self.edits.replace(end, next.start, "\n");
            }
        }
    }

    /// Statements between an opener, `{` or the `:` of a `case`, and an optional closing brace.
    fn statements(&mut self, opener: Option<usize>, statements: &[Span], closer: Option<usize>, forced: bool) {
        // Stray semicolons are for the semicolon rule to remove.
        let statements: Vec<Span> = statements.iter().copied().filter(|span| &self.text[span.start as usize..span.end as usize] != ";").collect();
        let (Some(first), Some(last)) = (statements.first(), statements.last()) else { return };
        let (first, last) = (first.start as usize, last.end as usize);
        let spread = forced || statements.len() > 1 || opener.is_some_and(|opener| self.broken(opener, first));

        if spread {
            if let Some(opener) = opener.filter(|&opener| !self.broken(opener, first)) {
                let gap = &self.text[opener..first];
                self.edits.replace(opener, first - gap.trim_start().len(), "\n");
            }
            for pair in statements.windows(2) {
                let (end, start) = (pair[0].end as usize, pair[1].start as usize);
                // A semicolon that guards the next line, `;(a as B).run()`, belongs to that line.
                let semicolon = self.tokens.before(end).filter(|token| token.kind == Kind::Semicolon);
                let guarded = semicolon.is_some_and(|semicolon| self.tokens.before(semicolon.start).is_some_and(|token| self.broken(token.end, semicolon.start)));
                if !self.broken(end, start) && !guarded {
                    self.break_before(end, start);
                }
            }
            if let Some(closer) = closer.filter(|&closer| !self.broken(last, closer)) {
                self.break_before(last, closer);
            }
        }
        else if let Some(closer) = closer.filter(|&closer| self.broken(last, closer) && self.blank(last, closer)) {
            self.edits.replace(last, closer, " ");
        }
    }

    /// An arrow function's body: an expression, or a block.
    fn arrow(&mut self, it: &ArrowFunctionExpression) {
        let after_head = it.return_type.as_ref().map_or(it.params.span.end, |return_type| return_type.span.end) as usize;
        let Some(arrow) = self.tokens.at(after_head).filter(|token| token.kind == Kind::Arrow) else { return };
        let Some(first) = self.tokens.at(arrow.end) else { return };
        let (start, end) = (first.start, it.span.end as usize);

        if first.kind != Kind::LCurly {
            if self.broken(arrow.end, start) && self.blank(arrow.end, start) {
                self.edits.replace(arrow.end, start, " {\nreturn ");
                self.edits.replace(end, end, "\n}");
            }
            return;
        }

        let ArrowFunctionBody::FunctionBody(body) = &it.body else { return };
        let [Statement::ReturnStatement(statement)] = body.statements.as_slice() else { return };
        let Some(argument) = statement.argument.as_ref().map(GetSpan::span) else { return };
        // The parentheses around a returned value, if any, come along. An object would need new ones.
        let Some(value) = self.tokens.at(statement.span.start as usize + "return".len()) else { return };
        let value_end = self.tokens.before(end - 1).map_or(argument.end as usize, |token| if token.kind == Kind::Semicolon { token.start } else { token.end });
        let plain = body.directives.is_empty() && value.kind != Kind::LCurly && self.blank(start + 1, statement.span.start as usize) && self.blank(statement.span.end as usize, end - 1);
        // The first break decides: a value that starts on the line of the `{` asks for the short form.
        if plain && !self.broken(start, value.start) && self.blank(statement.span.start as usize + "return".len(), value.start) {
            self.bare.insert(body.span);
            self.edits.delete(start, value.start);
            self.edits.delete(value_end, end);
        }
    }

    fn block(&mut self, span: Span, statements: &[Span]) {
        if !self.bare.contains(&span) && !self.joined.contains(&span) {
            self.statements(Some(span.start as usize + 1), statements, Some(span.end as usize - 1), !self.relaxed.contains(&span));
        }
    }

    /// The blocks of one `try`: each on one line, or each spread over lines.
    fn attempt(&mut self, blocks: &[&BlockStatement]) {
        let mut needs_lines = false;
        let mut first = None;
        for block in blocks {
            let (start, end) = (block.span.start as usize, block.span.end as usize);
            match block.body.as_slice() {
                // An empty block follows the others, unless it holds a comment on lines of its own.
                [] => needs_lines |= self.broken(start, end) && !self.blank(start + 1, end - 1),
                [statement] => {
                    let inner = statement.span();
                    let commented = !self.blank(start + 1, inner.start as usize) || !self.blank(inner.end as usize, end - 1);
                    needs_lines |= commented || self.broken(inner.start as usize, inner.end as usize);
                    first.get_or_insert(if self.broken(start, inner.start as usize) { Form::Braces } else { Form::Inline });
                }
                _ => needs_lines = true,
            }
        }
        // Spread over lines is what every block is unless something says otherwise.
        if needs_lines || first != Some(Form::Inline) {
            return;
        }

        for block in blocks {
            let (start, end) = (block.span.start as usize, block.span.end as usize);
            let [statement] = block.body.as_slice() else { continue };
            let inner = statement.span();
            self.joined.insert(block.span);
            for (from, to) in [(start + 1, inner.start as usize), (inner.end as usize, end - 1)] {
                if self.broken(from, to) {
                    self.edits.replace(from, to, " ");
                }
            }
        }
    }

    /// `catch` and `finally` start a line.
    fn clause(&mut self, block: Span, keyword: Kind) {
        let end = block.end as usize;
        let Some(next) = self.tokens.at(end).filter(|token| token.kind == keyword) else { return };
        if !self.broken(end, next.start) && self.blank(end, next.start) {
            self.edits.replace(end, next.start, "\n");
        }
    }
}

impl<'a> Visit<'a> for Blocks<'_> {
    fn visit_program(&mut self, it: &Program<'a>) {
        let spans: Vec<Span> = it.directives.iter().map(|directive| directive.span).chain(it.body.iter().map(GetSpan::span)).collect();
        self.statements(None, &spans, None, false);
        walk::walk_program(self, it);
    }

    fn visit_if_statement(&mut self, it: &IfStatement<'a>) {
        if !self.chained.contains(&it.span) {
            let mut branches = Vec::new();
            let mut current = it;
            loop {
                branches.push((&current.consequent, current.alternate.is_some()));
                match &current.alternate {
                    Some(Statement::IfStatement(next)) => {
                        self.chained.insert(next.span);
                        current = next;
                    }
                    Some(alternate) => {
                        branches.push((alternate, false));
                        break;
                    }
                    None => break,
                }
            }
            self.curly(&branches);
        }
        walk::walk_if_statement(self, it);
    }

    fn visit_for_statement(&mut self, it: &ForStatement<'a>) {
        self.curly(&[(&it.body, false)]);
        walk::walk_for_statement(self, it);
    }

    fn visit_for_in_statement(&mut self, it: &ForInStatement<'a>) {
        self.curly(&[(&it.body, false)]);
        walk::walk_for_in_statement(self, it);
    }

    fn visit_for_of_statement(&mut self, it: &ForOfStatement<'a>) {
        self.curly(&[(&it.body, false)]);
        walk::walk_for_of_statement(self, it);
    }

    fn visit_while_statement(&mut self, it: &WhileStatement<'a>) {
        self.curly(&[(&it.body, false)]);
        walk::walk_while_statement(self, it);
    }

    fn visit_try_statement(&mut self, it: &TryStatement<'a>) {
        let blocks: Vec<&BlockStatement> = [Some(&*it.block), it.handler.as_ref().map(|handler| &*handler.body), it.finalizer.as_deref()].into_iter().flatten().collect();
        self.attempt(&blocks);
        self.clause(it.block.span, Kind::Catch);
        self.clause(it.handler.as_ref().map_or(it.block.span, |handler| handler.body.span), Kind::Finally);
        walk::walk_try_statement(self, it);
    }

    fn visit_arrow_function_expression(&mut self, it: &ArrowFunctionExpression<'a>) {
        self.arrow(it);
        walk::walk_arrow_function_expression(self, it);
    }

    fn visit_block_statement(&mut self, it: &BlockStatement<'a>) {
        if matches!(it.body.as_slice(), [Statement::ThrowStatement(_)]) {
            self.relaxed.insert(it.span);
        }
        self.block(it.span, &it.body.iter().map(GetSpan::span).collect::<Vec<_>>());
        walk::walk_block_statement(self, it);
    }

    fn visit_function_body(&mut self, it: &FunctionBody<'a>) {
        if matches!(it.statements.as_slice(), [Statement::ThrowStatement(_)]) {
            self.relaxed.insert(it.span);
        }
        if !self.bare.contains(&it.span) {
            let spans: Vec<Span> = it.directives.iter().map(|directive| directive.span).chain(it.statements.iter().map(GetSpan::span)).collect();
            self.block(it.span, &spans);
        }
        walk::walk_function_body(self, it);
    }

    fn visit_static_block(&mut self, it: &StaticBlock<'a>) {
        self.block(it.span, &it.body.iter().map(GetSpan::span).collect::<Vec<_>>());
        walk::walk_static_block(self, it);
    }

    fn visit_ts_module_block(&mut self, it: &TSModuleBlock<'a>) {
        let spans: Vec<Span> = it.directives.iter().map(|directive| directive.span).chain(it.body.iter().map(GetSpan::span)).collect();
        self.block(it.span, &spans);
        walk::walk_ts_module_block(self, it);
    }

    fn visit_switch_case(&mut self, it: &SwitchCase<'a>) {
        if let Some(first) = it.consequent.first() {
            let colon = self.tokens.before(first.span().start as usize).filter(|token| token.kind == Kind::Colon);
            if let Some(colon) = colon {
                self.statements(Some(colon.end), &it.consequent.iter().map(GetSpan::span).collect::<Vec<_>>(), None, false);
            }
        }
        walk::walk_switch_case(self, it);
    }
}

#[cfg(test)]
mod tests {
    use crate::testing::format;
    use crate::testing::unchanged;

    #[test]
    fn inline() {
        unchanged("if (a) b()\nelse if (c) d()\nelse e()\n");
        unchanged("for (const a of b) c(a)\nwhile (a) b()\n");
        assert_eq!(format("if (a) { b() }\n"), "if (a) b()\n");
        assert_eq!(format("function f() {\n    if (a) { return b; }\n}\n"), "function f() {\n    if (a) return b\n}\n");
        assert_eq!(format("if (a) { b() } else { c() }\n"), "if (a) b()\nelse c()\n");
        assert_eq!(format("for (const a of b) { c(a) }\nwhile (a) { b() }\n"), "for (const a of b) c(a)\nwhile (a) b()\n");
        assert_eq!(format("if (a) { b()\n}\n"), "if (a) b()\n");
        assert_eq!(format("if (a) b()\nelse if (c) {\n    d()\n}\nelse {\n    e()\n}\n"), "if (a) b()\nelse if (c) d()\nelse e()\n");
    }

    #[test]
    fn next_line() {
        assert_eq!(format("if (a)\n    b()\n"), "if (a) {\n    b()\n}\n");
        assert_eq!(format("if (a)\n    b() // note\nc()\n"), "if (a) {\n    b() // note\n}\nc()\n");
        assert_eq!(format("for (const a of b)\n    c(a)\n"), "for (const a of b) {\n    c(a)\n}\n");
        assert_eq!(format("if (a)\n    b()\nelse c()\n"), "if (a) {\n    b()\n}\nelse {\n    c()\n}\n");
        assert_eq!(format("if (a) b()\nelse\n    c()\n"), "if (a) {\n    b()\n}\nelse {\n    c()\n}\n");
    }

    #[test]
    fn braces() {
        unchanged("if (a) {\n    b()\n}\n");
        unchanged("if (a) {\n    const b = 1\n}\n");
        unchanged("if (a) {}\n");
        assert_eq!(format("if (a) {\n    b()\n}\nelse c()\n"), "if (a) {\n    b()\n}\nelse {\n    c()\n}\n");
        assert_eq!(format("if (a) b()\nelse {\n    c()\n    d()\n}\n"), "if (a) {\n    b()\n}\nelse {\n    c()\n    d()\n}\n");
        assert_eq!(format("if (a)\n    b() // note\nelse {\n    c()\n    d()\n}\n"), "if (a) {\n    b() // note\n}\nelse {\n    c()\n    d()\n}\n");
        assert_eq!(format("if (a) b({\n    c,\n})\n"), "if (a) {\n    b({\n        c,\n    })\n}\n");
        assert_eq!(format("if (a)\n    if (b)\n        c()\n"), "if (a) {\n    if (b) {\n        c()\n    }\n}\n");
        assert_eq!(format("if (a) { const b = 1 }\n"), "if (a) {\n    const b = 1\n}\n");
        assert_eq!(format("if (a) { if (b) c() }\nelse d()\n"), "if (a) {\n    if (b) c()\n}\nelse {\n    d()\n}\n");
    }

    #[test]
    fn statements_split() {
        assert_eq!(format("a(); b()\n"), "a()\nb()\n");
        assert_eq!(format("function f() { a(); return b }\n"), "function f() {\n    a()\n    return b\n}\n");
        assert_eq!(format("let f = () => {\n    a() }\n"), "let f = () => {\n    a()\n}\n");
        assert_eq!(format("switch (a) {\n    case 1: b(); break\n    default: c()\n}\n"), "switch (a) {\n    case 1:\n        b()\n        break\n    default: c()\n}\n");
        assert_eq!(format("if (a) { b(); c() }\n"), "if (a) {\n    b()\n    c()\n}\n");
    }

    #[test]
    fn arrows_expanded() {
        assert_eq!(format("a.every((b) =>\n    c(b))\n"), "a.every((b) => {\n    return c(b)\n})\n");
        assert_eq!(format("a.every((b) =>\n    c(b),\n)\n"), "a.every((b) => {\n    return c(b)\n})\n");
        assert_eq!(format("let a = (b): string =>\n    b\n        ? c\n        : d\n"), "let a = (b): string => {\n    return b\n        ? c\n        : d\n}\n");
        assert_eq!(format("let a = () =>\n    ({ b })\n"), "let a = () => {\n    return ({ b })\n}\n");
        assert_eq!(format("let a = (b) =>\n    (c) => d\n"), "let a = (b) => {\n    return (c) => d\n}\n");
        unchanged("let a = () =>\n    // note\n    b\n");
        unchanged("let a = () => b\nlet c = () => ({})\nlet d = () => ({ e })\n");
        unchanged("let a = () => b(\n    c,\n)\n");
    }

    #[test]
    fn arrows_collapsed() {
        assert_eq!(format("let f = (a) => { return a }\n"), "let f = (a) => a\n");
        assert_eq!(format("a.map((b) => { return b.c; })\n"), "a.map((b) => b.c)\n");
        assert_eq!(format("let f = () => { return (a, b) }\n"), "let f = () => (a, b)\n");
        assert_eq!(format("a.map((b) => { return b.c\n})\n"), "a.map((b) => b.c)\n");
        assert_eq!(format("a.map((b) => { return b.c(\n    d,\n)\n})\n"), "a.map((b) => b.c(\n    d,\n))\n");
        assert_eq!(format("a.map((b) => { return b\n    ? c\n    : d\n})\n"), "a.map((b) => b\n    ? c\n    : d)\n");
        unchanged("let f = (a) => {\n    return a(\n        b,\n    )\n}\n");
        assert_eq!(format("let f = (a) => { return a\n    // note\n}\n"), "let f = (a) => {\n    return a\n    // note\n}\n");
        assert_eq!(format("let f = () => { return { a } }\n"), "let f = () => {\n    return { a }\n}\n");
        assert_eq!(format("let f = () => { return }\n"), "let f = () => {\n    return\n}\n");
        unchanged("let f = (a) => {\n    return a\n}\n");
    }

    #[test]
    fn blocks_span_lines() {
        assert_eq!(format("let f = () => { a() }\n"), "let f = () => {\n    a()\n}\n");
        assert_eq!(format("function g() { return 1 }\n"), "function g() {\n    return 1\n}\n");
        unchanged("a.catch(() => { throw new Error(\"b\") })\nfunction f() { throw a }\n");
        assert_eq!(format("if (a) { throw b }\n"), "if (a) throw b\n");
        unchanged("let h = () => {}\nfunction i() {}\n");
    }

    #[test]
    fn clauses() {
        assert_eq!(format("if (a) {\n    b()\n} else {\n    c()\n}\n"), "if (a) {\n    b()\n}\nelse {\n    c()\n}\n");
        assert_eq!(format("try {\n    a()\n} catch {\n    b()\n} finally {\n    c()\n}\n"), "try {\n    a()\n}\ncatch {\n    b()\n}\nfinally {\n    c()\n}\n");
        assert_eq!(format("try { a() } catch { b() } finally { c() }\n"), "try { a() }\ncatch { b() }\nfinally { c() }\n");
    }

    #[test]
    fn tries() {
        unchanged("try { a() }\ncatch { b() }\nfinally { c() }\n");
        unchanged("try {\n    a()\n}\ncatch {\n    b()\n}\nfinally {\n    c()\n}\n");
        unchanged("try { a() }\ncatch {}\n");
        unchanged("try {\n    a()\n}\ncatch {}\n");
        unchanged("try { a() }\ncatch { /* ignore */ }\n");
        unchanged("try {}\ncatch {}\n");
        // The first block decides.
        assert_eq!(format("try {\n    a()\n}\ncatch (b) { c(b) }\nfinally { d() }\n"), "try {\n    a()\n}\ncatch (b) {\n    c(b)\n}\nfinally {\n    d()\n}\n");
        assert_eq!(format("try { a()\n}\ncatch (b) {\n    c(b)\n}\nfinally {\n    d()\n}\n"), "try { a() }\ncatch (b) { c(b) }\nfinally { d() }\n");
        // A block that just throws may stay on one line, as it may anywhere else.
        unchanged("try {\n    a()\n}\ncatch { throw b }\n");
        // A block that needs lines spreads out all of them.
        assert_eq!(format("try { a(); b() } catch {}\n"), "try {\n    a()\n    b()\n}\ncatch {}\n");
        assert_eq!(format("try { a() }\ncatch {\n    b()\n    c()\n}\n"), "try {\n    a()\n}\ncatch {\n    b()\n    c()\n}\n");
        assert_eq!(format("try { a() }\ncatch {\n    // ignore\n}\n"), "try {\n    a()\n}\ncatch {\n    // ignore\n}\n");
        assert_eq!(format("try { a({\n    b,\n}) }\nfinally { c() }\n"), "try {\n    a({\n        b,\n    })\n}\nfinally {\n    c()\n}\n");
        assert_eq!(format("function f() {\n    try { return a() }\n    finally {\n        b()\n    }\n}\n"), "function f() {\n    try { return a() }\n    finally { b() }\n}\n");
        assert_eq!(format("if (a) b(); else c()\n"), "if (a) b()\nelse c()\n");
    }
}
