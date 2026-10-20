//! `antfu/consistent-list-newline`, `antfu/consistent-chaining` and the layout of JSX props: the first break decides.
//!
//! A list whose first item sits on a new line gets every item, and its closing bracket, on a line of
//! its own. A list whose first item follows the opening bracket is joined onto one line. A chain works
//! the same way, going by whether its first call starts a line: `a.b\n.c()` is split, `a.b.c()` is joined.
//!
//! The props of a JSX tag are a list as well, closed by `>` or `/>`. Here a prop that spans several lines
//! spreads out the whole tag, the way a branch with several statements puts every branch of an `if` in braces.
//!
//! Only the breaks between items are touched. An item that spans several lines itself, such as a
//! callback, keeps its shape, and a list is left alone when joining it would swallow a comment.

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

pub fn run(source: &Source, edits: &mut Edits) {
    Breaks { text: source.text, tokens: &source.tokens, edits, links: HashSet::new(), dots: Vec::new() }.visit_program(source.program);
}

/// The whitespace, and possibly comments, between two tokens.
#[derive(Clone, Copy)]
struct Gap {
    start: usize,
    end: usize,
}

struct Breaks<'s> {
    text: &'s str,
    tokens: &'s [Token],
    edits: &'s mut Edits,
    /// The links of chains already handled from their outermost link.
    links: HashSet<Span>,
    /// The start of each property name in the chain being collected, and whether it is part of the root.
    dots: Vec<(u32, bool)>,
}

impl Breaks<'_> {
    fn token_at(&self, offset: u32) -> Option<Token> {
        let index = self.tokens.partition_point(|token| token.start < offset as usize);
        self.tokens.get(index).copied()
    }

    fn token_before(&self, offset: usize) -> Option<Token> {
        let index = self.tokens.partition_point(|token| token.end <= offset);
        index.checked_sub(1).map(|index| self.tokens[index])
    }

    fn broken(&self, gap: Gap) -> bool {
        self.text[gap.start..gap.end].contains('\n')
    }

    fn has_comment(&self, gap: Gap) -> bool {
        !self.text[gap.start..gap.end].trim().is_empty()
    }

    /// Whether the breaks in these gaps can be removed without pulling a comment into the line.
    fn joinable(&self, gaps: &[Gap]) -> bool {
        !gaps.iter().any(|&gap| self.broken(gap) && self.has_comment(gap))
    }

    /// Puts a break at the start of the gap, right after the token before it.
    fn break_after(&mut self, gap: Gap) {
        let text = &self.text[gap.start..gap.end];
        self.edits.replace(gap.start, gap.end - text.trim_start().len(), "\n");
    }

    /// Puts a break at the end of the gap, right before the token after it.
    fn break_before(&mut self, gap: Gap) {
        let text = &self.text[gap.start..gap.end];
        self.edits.replace(gap.start + text.trim_end().len(), gap.end, "\n");
    }

    /// A list of items separated by commas, between a pair of brackets.
    fn list(&mut self, items: &[Span]) {
        let (Some(first), Some(last)) = (items.first(), items.last()) else { return };
        let Some(opener) = self.token_before(first.start as usize) else { return };
        if !matches!(opener.kind, Kind::LParen | Kind::LBrack | Kind::LCurly | Kind::LAngle) {
            return;
        }

        let mut gaps = vec![Gap { start: opener.end, end: first.start as usize }];
        for pair in items.windows(2) {
            let Some(comma) = self.token_at(pair[0].end).filter(|token| token.kind == Kind::Comma) else { return };
            let next = pair[1].start as usize;
            // Anything else between two items, such as a hole in an array, is not this rule's business.
            if self.token_at(comma.end as u32).is_none_or(|token| token.start != next) || self.text[pair[0].end as usize..comma.start].contains('\n') {
                return;
            }
            gaps.push(Gap { start: comma.end, end: next });
        }

        let Some(after) = self.token_at(last.end) else { return };
        let Some(closer) = (if after.kind == Kind::Comma { self.token_at(after.end as u32) } else { Some(after) }) else { return };
        if !matches!(closer.kind, Kind::RParen | Kind::RBrack | Kind::RCurly | Kind::RAngle) {
            return;
        }
        let closing = Gap { start: if after.kind == Kind::Comma { after.end } else { last.end as usize }, end: closer.start };

        if self.broken(gaps[0]) {
            for &gap in &gaps[1..] {
                if !self.broken(gap) {
                    self.break_after(gap);
                }
            }
            if !self.broken(closing) {
                self.break_before(closing);
            }
        }
        else if self.joinable(&gaps) && self.joinable(&[closing]) {
            for &gap in &gaps[1..] {
                if self.broken(gap) {
                    self.edits.replace(gap.start, gap.end, " ");
                }
            }
            if self.broken(closing) {
                self.edits.delete(closing.start, closing.end);
            }
        }
    }

    /// The props of a JSX tag: one line, or one prop per line with the closing bracket on its own.
    fn props(&mut self, it: &JSXOpeningElement) {
        let (Some(first), Some(last)) = (it.attributes.first(), it.attributes.last()) else { return };
        let Some(name) = self.token_before(first.span().start as usize) else { return };
        let Some(end) = self.token_before(it.span.end as usize).filter(|token| token.kind == Kind::RAngle) else { return };
        let closer = self.token_before(end.start).filter(|token| token.kind == Kind::Slash).unwrap_or(end);

        let mut gaps = vec![Gap { start: name.end, end: first.span().start as usize }];
        gaps.extend(it.attributes.windows(2).map(|pair| Gap { start: pair[0].span().end as usize, end: pair[1].span().start as usize }));
        gaps.push(Gap { start: last.span().end as usize, end: closer.start });

        let spans_lines = it.attributes.iter().any(|attribute| self.text[attribute.span().start as usize..attribute.span().end as usize].contains('\n'));
        if self.broken(gaps[0]) || spans_lines {
            for &gap in &gaps {
                if !self.broken(gap) {
                    self.break_before(gap);
                }
            }
        }
        else if self.joinable(&gaps) {
            for &gap in &gaps[1..] {
                if self.broken(gap) {
                    let space = if gap.end == closer.start && closer.kind == Kind::RAngle { "" } else { " " };
                    self.edits.replace(gap.start, gap.end, space);
                }
            }
        }
    }

    /// The members of an interface or type literal, which may be separated by nothing but a line break.
    fn members(&mut self, body: Span, members: &[TSSignature]) {
        let Some(first) = members.first() else { return };
        let opening = Gap { start: body.start as usize + 1, end: first.span().start as usize };
        let closer = body.end as usize - 1;

        let starts = members[1..].iter().map(|member| member.span().start as usize).chain([closer]);
        let gaps: Vec<(Gap, Token)> = starts.filter_map(|start| self.token_before(start).map(|before| (Gap { start: before.end, end: start }, before))).collect();

        if self.broken(opening) {
            for &(gap, _) in &gaps {
                match gap.end == closer {
                    _ if self.broken(gap) => {}
                    true => self.break_before(gap),
                    false => self.break_after(gap),
                }
            }
        }
        else if self.joinable(&gaps.iter().map(|&(gap, _)| gap).collect::<Vec<_>>()) {
            for &(gap, before) in &gaps {
                let separated = matches!(before.kind, Kind::Semicolon | Kind::Comma);
                match gap.end == closer {
                    _ if !self.broken(gap) => {}
                    true => self.edits.delete(gap.start, gap.end),
                    false => self.edits.replace(gap.start, gap.end, if separated { " " } else { ", " }),
                }
            }
        }
    }

    /// Called with the outermost link of a chain, `a.b().c` for `a.b().c`.
    fn chain(&mut self) {
        let dots: Vec<Gap> = std::mem::take(&mut self.dots)
            .into_iter()
            .rev()
            .filter_map(|(property, root)| {
                let dot = self.token_before(property as usize).filter(|token| matches!(token.kind, Kind::Dot | Kind::QuestionDot))?;
                Some((Gap { start: self.token_before(dot.start)?.end, end: dot.start }, root))
            })
            .collect::<Vec<_>>()
            .into_iter()
            // The root of a chain may be a path, `a.b.c`, as long as it is written on one line.
            .skip_while(|&(gap, root)| root && !self.broken(gap))
            .map(|(gap, _)| gap)
            .collect();
        let Some(&first) = dots.first() else { return };

        if self.broken(first) {
            for &gap in &dots[1..] {
                if !self.broken(gap) {
                    self.break_before(gap);
                }
            }
        }
        else if self.joinable(&dots) {
            for &gap in &dots[1..] {
                if self.broken(gap) {
                    self.edits.delete(gap.start, gap.end);
                }
            }
        }
    }

    /// Follows a chain inwards from one of its links, collecting the `.` of every property access.
    fn link(&mut self, expression: &Expression, called: bool) -> bool {
        self.links.insert(expression.span());
        match expression {
            Expression::StaticMemberExpression(member) => {
                self.dots.push((member.property.span.start, !called));
                self.link(&member.object, false);
            }
            Expression::PrivateFieldExpression(member) => {
                self.dots.push((member.field.span.start, !called));
                self.link(&member.object, false);
            }
            Expression::ComputedMemberExpression(member) => {
                self.link(&member.object, false);
            }
            Expression::CallExpression(call) => {
                self.link(&call.callee, true);
            }
            Expression::TSNonNullExpression(non_null) => {
                self.link(&non_null.expression, called);
            }
            Expression::ChainExpression(chain) => match &chain.expression {
                ChainElement::StaticMemberExpression(member) => {
                    self.dots.push((member.property.span.start, !called));
                    self.link(&member.object, false);
                }
                ChainElement::PrivateFieldExpression(member) => {
                    self.dots.push((member.field.span.start, !called));
                    self.link(&member.object, false);
                }
                ChainElement::ComputedMemberExpression(member) => {
                    self.link(&member.object, false);
                }
                ChainElement::CallExpression(call) => {
                    self.link(&call.callee, true);
                }
                ChainElement::TSNonNullExpression(non_null) => {
                    self.link(&non_null.expression, called);
                }
            },
            _ => return false,
        }
        true
    }
}

impl<'a> Visit<'a> for Breaks<'_> {
    fn visit_expression(&mut self, it: &Expression<'a>) {
        if !self.links.contains(&it.span()) && self.link(it, false) {
            self.chain();
        }
        walk::walk_expression(self, it);
    }

    fn visit_jsx_opening_element(&mut self, it: &JSXOpeningElement<'a>) {
        self.props(it);
        walk::walk_jsx_opening_element(self, it);
    }

    fn visit_array_expression(&mut self, it: &ArrayExpression<'a>) {
        self.list(&it.elements.iter().map(GetSpan::span).collect::<Vec<_>>());
        walk::walk_array_expression(self, it);
    }

    fn visit_object_expression(&mut self, it: &ObjectExpression<'a>) {
        self.list(&it.properties.iter().map(GetSpan::span).collect::<Vec<_>>());
        walk::walk_object_expression(self, it);
    }

    fn visit_array_pattern(&mut self, it: &ArrayPattern<'a>) {
        if it.elements.iter().all(Option::is_some) {
            let elements = it.elements.iter().flatten().map(GetSpan::span);
            self.list(&elements.chain(it.rest.as_ref().map(|rest| rest.span)).collect::<Vec<_>>());
        }
        walk::walk_array_pattern(self, it);
    }

    fn visit_object_pattern(&mut self, it: &ObjectPattern<'a>) {
        let properties = it.properties.iter().map(|property| property.span);
        self.list(&properties.chain(it.rest.as_ref().map(|rest| rest.span)).collect::<Vec<_>>());
        walk::walk_object_pattern(self, it);
    }

    fn visit_formal_parameters(&mut self, it: &FormalParameters<'a>) {
        let items = it.items.iter().map(|parameter| parameter.span);
        self.list(&items.chain(it.rest.as_ref().map(|rest| rest.span)).collect::<Vec<_>>());
        walk::walk_formal_parameters(self, it);
    }

    fn visit_call_expression(&mut self, it: &CallExpression<'a>) {
        self.list(&it.arguments.iter().map(GetSpan::span).collect::<Vec<_>>());
        walk::walk_call_expression(self, it);
    }

    fn visit_new_expression(&mut self, it: &NewExpression<'a>) {
        self.list(&it.arguments.iter().map(GetSpan::span).collect::<Vec<_>>());
        walk::walk_new_expression(self, it);
    }

    fn visit_import_declaration(&mut self, it: &ImportDeclaration<'a>) {
        if let Some(specifiers) = &it.specifiers {
            let named = specifiers.iter().filter(|specifier| matches!(specifier, ImportDeclarationSpecifier::ImportSpecifier(_)));
            self.list(&named.map(GetSpan::span).collect::<Vec<_>>());
        }
        walk::walk_import_declaration(self, it);
    }

    fn visit_export_named_declaration(&mut self, it: &ExportNamedDeclaration<'a>) {
        self.list(&it.specifiers.iter().map(|specifier| specifier.span).collect::<Vec<_>>());
        walk::walk_export_named_declaration(self, it);
    }

    fn visit_export_from_declaration(&mut self, it: &ExportFromDeclaration<'a>) {
        self.list(&it.specifiers.iter().map(|specifier| specifier.span).collect::<Vec<_>>());
        walk::walk_export_from_declaration(self, it);
    }

    fn visit_ts_enum_body(&mut self, it: &TSEnumBody<'a>) {
        self.list(&it.members.iter().map(|member| member.span).collect::<Vec<_>>());
        walk::walk_ts_enum_body(self, it);
    }

    fn visit_ts_tuple_type(&mut self, it: &TSTupleType<'a>) {
        self.list(&it.element_types.iter().map(GetSpan::span).collect::<Vec<_>>());
        walk::walk_ts_tuple_type(self, it);
    }

    fn visit_ts_type_parameter_instantiation(&mut self, it: &TSTypeParameterInstantiation<'a>) {
        self.list(&it.params.iter().map(GetSpan::span).collect::<Vec<_>>());
        walk::walk_ts_type_parameter_instantiation(self, it);
    }

    fn visit_ts_type_parameter_declaration(&mut self, it: &TSTypeParameterDeclaration<'a>) {
        self.list(&it.params.iter().map(|parameter| parameter.span).collect::<Vec<_>>());
        walk::walk_ts_type_parameter_declaration(self, it);
    }

    fn visit_ts_interface_body(&mut self, it: &TSInterfaceBody<'a>) {
        self.members(it.span, &it.body);
        walk::walk_ts_interface_body(self, it);
    }

    fn visit_ts_type_literal(&mut self, it: &TSTypeLiteral<'a>) {
        self.members(it.span, &it.members);
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

    fn unchanged(text: &str) {
        assert_eq!(format(text), text);
    }

    #[test]
    fn lists_split() {
        assert_eq!(format("const a = [\n    1, 2, 3]\n"), "const a = [\n    1,\n    2,\n    3,\n]\n");
        assert_eq!(format("const a = {\n    b: 1, c: 2 }\n"), "const a = {\n    b: 1,\n    c: 2,\n}\n");
        assert_eq!(format("foo(\n    a, b)\n"), "foo(\n    a,\n    b,\n)\n");
        assert_eq!(format("function f(\n    a: string, b: number) {}\n"), "function f(\n    a: string,\n    b: number,\n) {}\n");
        assert_eq!(format("import {\n    a, b } from \"a\"\n"), "import {\n    a,\n    b,\n} from \"a\"\n");
        assert_eq!(format("const {\n    a, ...b } = c\n"), "const {\n    a,\n    ...b\n} = c\n");
        assert_eq!(format("type A = Map<\n    string, number>\n"), "type A = Map<\n    string,\n    number,\n>\n");
    }

    #[test]
    fn lists_joined() {
        assert_eq!(format("const a = [1,\n    2,\n    3,\n]\n"), "const a = [1, 2, 3]\n");
        assert_eq!(format("const a = { b: 1,\n    c: 2,\n}\n"), "const a = { b: 1, c: 2 }\n");
        assert_eq!(format("foo(a,\n    b)\n"), "foo(a, b)\n");
        assert_eq!(format("function f(a: string,\n    b: number,\n) {}\n"), "function f(a: string, b: number) {}\n");
        assert_eq!(format("import { a,\n    b,\n} from \"a\"\n"), "import { a, b } from \"a\"\n");
        assert_eq!(format("enum A { B,\n    C,\n}\n"), "enum A { B, C }\n");
    }

    #[test]
    fn lists_left_alone() {
        unchanged("foo(a, {\n    b,\n})\n");
        unchanged("foo(a, () => {\n    b()\n}, [c])\n");
        unchanged("const a = [{\n    b: 1,\n}, {\n    b: 2,\n}]\n");
        unchanged("const a = [1, // one\n    2]\n");
        unchanged("const a = [\n    // one\n    1,\n    2,\n]\n");
        assert_eq!(format("foo(a, {\n    b,\n}\n)\n"), "foo(a, {\n    b,\n})\n");
        unchanged("const a = [1, , 2]\nfoo()\nconst b = []\n");
    }

    #[test]
    fn jsx_props() {
        let format = |text: &str| format_text(Path::new("test.tsx"), text, &Configuration::default()).unwrap().unwrap_or_else(|| text.to_string());
        assert_eq!(format("const a = <B\n    c d=\"e\" />\n"), "const a = (\n    <B\n        c\n        d=\"e\"\n    />\n)\n");
        assert_eq!(format("const a = (\n    <B\n        c d>\n        e\n    </B>\n)\n"), "const a = (\n    <B\n        c\n        d\n    >\n        e\n    </B>\n)\n");
        assert_eq!(format("const a = (\n    <B c\n        d\n    />\n)\n"), "const a = (\n    <B c d />\n)\n");
        assert_eq!(format("const a = (\n    <B c\n        d\n    >\n        e\n    </B>\n)\n"), "const a = (\n    <B c d>\n        e\n    </B>\n)\n");
        assert_eq!(format("const a = <B c d e />\n"), "const a = <B c d e />\n");
        assert_eq!(format("const a = <B c={{\n    d,\n}} e />\n"), "const a = (\n    <B\n        e\n        c={{\n            d,\n        }}\n    />\n)\n");
        assert_eq!(format("const a = <B />\nconst c = <D e f />\nconst g = <H<I> j />\n"), "const a = <B />\nconst c = <D e f />\nconst g = <H<I> j />\n");
    }

    #[test]
    fn type_members() {
        assert_eq!(format("type A = {\n    a: string, b: number }\n"), "type A = {\n    a: string\n    b: number\n}\n");
        assert_eq!(format("interface A { a: string\n    b: number\n    c(): void\n}\n"), "interface A { a: string, b: number, c(): void }\n");
        assert_eq!(format("type A = { a: string;\n    b: number;\n}\n"), "type A = { a: string, b: number }\n");
        unchanged("type A = { a: string, b: number }\n");
        unchanged("type A = {\n    a: string\n    b: {\n        c: number\n    }\n}\n");
    }

    #[test]
    fn chains_split() {
        assert_eq!(format("const a = b\n    .c().d()\n    .e()\n"), "const a = b\n    .c()\n    .d()\n    .e()\n");
        assert_eq!(format("const a = B.c\n    .d().e()\n"), "const a = B.c\n    .d()\n    .e()\n");
        assert_eq!(format("a\n    .b.c?.d()!.e\n"), "a\n    .b\n    .c\n    ?.d()!\n    .e\n");
    }

    #[test]
    fn chains_joined() {
        assert_eq!(format("const a = b.c()\n    .d()\n    .e()\n"), "const a = b.c().d().e()\n");
        assert_eq!(format("const a = B.c()\n    .d()\n"), "const a = B.c().d()\n");
        assert_eq!(format("a.b((c) => {\n    d()\n})\n    .e()\n"), "a.b((c) => {\n    d()\n}).e()\n");
    }

    #[test]
    fn chains_left_alone() {
        unchanged("a.b(c\n    .d()\n    .e())\n");
        unchanged("a.b()\n    // note\n    .c()\n");
        unchanged("a.b[0].c().d\n");
        unchanged("const a = B.c\n    .d()\n    .e()\n");
        unchanged("this.a.b\n    .c()\n    .d()\n");
    }
}
