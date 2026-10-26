//! `operator-linebreak`, `multiline-ternary`, `dot-location` and `comma-style`: which side of a line break
//! an operator sits on.
//!
//! An expression that continues on the next line carries its operator along: `&& b`, `| B`, `.c()`, `? d`.
//! The exceptions are `=` and commas, which end the line before.
//!
//! A ternary follows the first break. With a break before its `?` or right after it, `?` and `:` each start
//! a line. With the first break before its `:`, it is a list of cases and keeps that break: `a ? b`, then
//! `: c ? d` and `: e` on lines of their own. Without a break, the whole ternary is joined.

use oxc_ast::ast::*;
use oxc_ast_visit::Visit;
use oxc_ast_visit::walk;
use oxc_parser::Kind;
use oxc_span::GetSpan;
use oxc_span::Span;
use rustc_hash::FxHashSet;

use crate::edits::Edits;
use crate::source::Source;
use crate::source::Token;
use crate::source::Tokens;

pub fn run(source: &Source, edits: &mut Edits) {
    let mut operators = Operators { text: source.text, tokens: &source.tokens, edits, cases: FxHashSet::default() };
    operators.commas();
    operators.visit_program(source.program);
}

struct Operators<'s> {
    text: &'s str,
    tokens: &'s [Token],
    edits: &'s mut Edits,
    /// The alternates of ternaries that are a list of cases, which continue the list.
    cases: FxHashSet<Span>,
}

impl Operators<'_> {


    fn broken(&self, start: usize, end: usize) -> bool {
        self.text[start..end].contains('\n')
    }

    fn blank(&self, start: usize, end: usize) -> bool {
        self.text[start..end].trim().is_empty()
    }

    /// The tokens on either side of an operator.
    fn around(&self, operator: Token) -> Option<(Token, Token)> {
        Some((self.tokens.before(operator.start)?, self.tokens.at(operator.end)?))
    }

    /// Moves an operator that ends a line to the start of the next one.
    fn leading(&mut self, operator: Option<Token>) {
        let Some(operator) = operator else { return };
        let Some((before, after)) = self.around(operator) else { return };
        if self.broken(operator.end, after.start) && !self.broken(before.end, operator.start) && self.blank(before.end, operator.start) {
            let text = &self.text[operator.start..operator.end];
            self.edits.delete(before.end, operator.end);
            self.edits.replace(after.start, after.start, format!("{text} "));
        }
    }

    /// Moves an operator that starts a line to the end of the one before.
    fn trailing(&mut self, operator: Option<Token>) {
        let Some(operator) = operator else { return };
        let Some((before, after)) = self.around(operator) else { return };
        if self.broken(before.end, operator.start) && !self.broken(operator.end, after.start) && self.blank(before.end, operator.start) && self.blank(operator.end, after.start) {
            let text = &self.text[operator.start..operator.end];
            self.edits.replace(before.end, before.end, format!(" {text}"));
            self.edits.delete(operator.start, after.start);
        }
    }

    /// The `=` in front of a value.
    fn equals(&self, value: Span) -> Option<Token> {
        self.tokens.before(value.start).filter(|token| token.kind == Kind::Eq)
    }

    /// `span` is the whole ternary, `chained` whether its alternate is a ternary as well.
    fn ternary(&mut self, span: Span, test: Span, consequent: Span, alternate_span: Span, chained: bool) {
        let Some(question) = self.tokens.at(test.end).filter(|token| token.kind == Kind::Question) else { return };
        let Some(colon) = self.tokens.at(consequent.end).filter(|token| token.kind == Kind::Colon) else { return };
        let Some(alternate) = self.tokens.at(colon.end) else { return };

        let gaps = [(test.end as usize, question.start), (question.end, consequent.start as usize), (consequent.end as usize, colon.start), (colon.end, alternate.start)];
        if gaps.iter().any(|&(start, end)| !self.blank(start, end)) {
            return;
        }

        let spread = self.broken(gaps[0].0, gaps[0].1) || self.broken(gaps[1].0, gaps[1].1);
        // Without a break around the `?`, one before the `:` of a chain of ternaries makes a list of cases, one
        // per line: `a ? b`, `: c ? d`, `: e`. A single ternary is joined.
        let cases = !spread && self.broken(gaps[2].0, gaps[2].1) && (chained || self.cases.contains(&span));
        if cases {
            self.cases.insert(alternate_span);
        }
        for (index, &(start, end)) in gaps.iter().enumerate() {
            let before_operator = index % 2 == 0;
            match (spread && before_operator, self.broken(start, end)) {
                (true, false) => self.edits.replace(start, end, "\n"),
                (false, true) if !(cases && index == 2) => self.edits.replace(start, end, " "),
                _ => {}
            }
        }
    }

    /// `comma-style`: a comma that starts a line moves to the end of the line before.
    fn commas(&mut self) {
        for (index, comma) in self.tokens.iter().enumerate().filter(|(_, token)| token.kind == Kind::Comma) {
            let (Some(before), Some(after)) = (index.checked_sub(1).map(|index| self.tokens[index]), self.tokens.get(index + 1)) else { continue };
            if self.broken(before.end, comma.start) && self.blank(before.end, comma.start) && !self.broken(comma.end, after.start) && before.kind != Kind::Comma {
                self.edits.replace(before.end, comma.end, ",\n");
            }
        }
    }

    /// `dot-location`: the `.` belongs to the property after it.
    fn dot(&mut self, property: Span) {
        let Some(dot) = self.tokens.before(property.start).filter(|token| matches!(token.kind, Kind::Dot | Kind::QuestionDot)) else { return };
        let Some(before) = self.tokens.before(dot.start) else { return };
        if self.broken(dot.end, property.start as usize) && !self.broken(before.end, dot.start) && self.blank(before.end, dot.start) {
            let text = &self.text[dot.start..dot.end];
            self.edits.delete(before.end, dot.end);
            self.edits.replace(property.start as usize, property.start as usize, text);
        }
    }

    fn between(&mut self, types: &[TSType]) {
        for r#type in &types[..types.len().saturating_sub(1)] {
            self.leading(self.tokens.at(r#type.span().end));
        }
    }
}

impl<'a> Visit<'a> for Operators<'_> {
    fn visit_binary_expression(&mut self, it: &BinaryExpression<'a>) {
        self.leading(self.tokens.at(it.left.span().end));
        walk::walk_binary_expression(self, it);
    }

    fn visit_logical_expression(&mut self, it: &LogicalExpression<'a>) {
        self.leading(self.tokens.at(it.left.span().end));
        walk::walk_logical_expression(self, it);
    }

    fn visit_conditional_expression(&mut self, it: &ConditionalExpression<'a>) {
        self.ternary(it.span, it.test.span(), it.consequent.span(), it.alternate.span(), matches!(it.alternate.without_parentheses(), Expression::ConditionalExpression(_)));
        walk::walk_conditional_expression(self, it);
    }

    fn visit_ts_conditional_type(&mut self, it: &TSConditionalType<'a>) {
        self.ternary(it.span, it.extends_type.span(), it.true_type.span(), it.false_type.span(), matches!(it.false_type, TSType::TSConditionalType(_)));
        walk::walk_ts_conditional_type(self, it);
    }

    fn visit_ts_union_type(&mut self, it: &TSUnionType<'a>) {
        self.between(&it.types);
        walk::walk_ts_union_type(self, it);
    }

    fn visit_ts_intersection_type(&mut self, it: &TSIntersectionType<'a>) {
        self.between(&it.types);
        walk::walk_ts_intersection_type(self, it);
    }

    fn visit_static_member_expression(&mut self, it: &StaticMemberExpression<'a>) {
        self.dot(it.property.span);
        walk::walk_static_member_expression(self, it);
    }

    fn visit_private_field_expression(&mut self, it: &PrivateFieldExpression<'a>) {
        self.dot(it.field.span);
        walk::walk_private_field_expression(self, it);
    }

    fn visit_assignment_expression(&mut self, it: &AssignmentExpression<'a>) {
        self.trailing(self.tokens.at(it.left.span().end));
        walk::walk_assignment_expression(self, it);
    }

    fn visit_variable_declarator(&mut self, it: &VariableDeclarator<'a>) {
        if let Some(init) = &it.init {
            self.trailing(self.equals(init.span()));
        }
        walk::walk_variable_declarator(self, it);
    }

    fn visit_assignment_pattern(&mut self, it: &AssignmentPattern<'a>) {
        self.trailing(self.equals(it.right.span()));
        walk::walk_assignment_pattern(self, it);
    }

    fn visit_formal_parameter(&mut self, it: &FormalParameter<'a>) {
        if let Some(initializer) = &it.initializer {
            self.trailing(self.equals(initializer.span()));
        }
        walk::walk_formal_parameter(self, it);
    }

    fn visit_property_definition(&mut self, it: &PropertyDefinition<'a>) {
        if let Some(value) = &it.value {
            self.trailing(self.equals(value.span()));
        }
        walk::walk_property_definition(self, it);
    }

    fn visit_ts_type_alias_declaration(&mut self, it: &TSTypeAliasDeclaration<'a>) {
        self.trailing(self.equals(it.type_annotation.span()));
        walk::walk_ts_type_alias_declaration(self, it);
    }
}

#[cfg(test)]
mod tests {
    use crate::testing::format;
    use crate::testing::unchanged;

    #[test]
    fn operators_start_the_line() {
        assert_eq!(format("const a = b &&\n    c ||\n    d\n"), "const a = b\n    && c\n    || d\n");
        assert_eq!(format("const a = b +\n    c -\n    d\n"), "const a = b\n    + c\n    - d\n");
        assert_eq!(format("const a = b ?? // note\n    c\n"), "const a = b // note\n    ?? c\n");
        assert_eq!(format("const a = b instanceof\n    C\n"), "const a = b\n    instanceof C\n");
        assert_eq!(format("type A =\n    B |\n    C |\n    D\n"), "type A =\n    | B\n    | C\n    | D\n");
        assert_eq!(format("type A = B &\n    C\n"), "type A = B\n    & C\n");
        unchanged("const a = b\n    && c\n    && d\n");
        unchanged("type A =\n    | B\n    | C\n");
    }

    #[test]
    fn equals_ends_the_line() {
        assert_eq!(format("const a\n    = b\n"), "const a =\n    b\n");
        assert_eq!(format("a.b\n    = c\na\n    ??= d\n"), "a.b =\n    c\na ??=\n    d\n");
        assert_eq!(format("type A\n    = B\n"), "type A =\n    B\n");
        assert_eq!(format("function f(a\n    = 1) {}\n"), "function f(a =\n    1) {}\n");
        unchanged("const a =\n    b\n");
    }

    #[test]
    fn ternaries() {
        assert_eq!(format("const a = b ?\n    c :\n    d\n"), "const a = b\n    ? c\n    : d\n");
        assert_eq!(format("const a = b\n    ? c : d\n"), "const a = b\n    ? c\n    : d\n");
        assert_eq!(format("const a = b ? c\n    : d\n"), "const a = b ? c : d\n");
        assert_eq!(format("type A = B extends C ?\n    D :\n    E\n"), "type A = B extends C\n    ? D\n    : E\n");
        assert_eq!(format("const a = b\n    ? c\n    : d ? e : f\n"), "const a = b\n    ? c\n    : d ? e : f\n");
        unchanged("const a = b ? c\n    : d ? e\n    : f\n");
        unchanged("type A = B extends C ? D\n    : E extends F ? G\n    : H extends I ? J\n    : K\n");
        unchanged("const a = b ? c : d\n");
        unchanged("const a = b ? {\n    c,\n} : d\n");
        unchanged("const a = b // note\n    ? c\n    : d\n");
    }

    #[test]
    fn dots() {
        assert_eq!(format("const a = b.\n    c().\n    d()\n"), "const a = b\n    .c()\n    .d()\n");
        assert_eq!(format("const a = b?.\n    c\n"), "const a = b\n    ?.c\n");
        unchanged("const a = b\n    .c()\n    .d()\n");
    }

    #[test]
    fn commas() {
        assert_eq!(format("const a = [\n    1\n    , 2\n    , 3,\n]\n"), "const a = [\n    1,\n    2,\n    3,\n]\n");
        assert_eq!(format("foo(\n    a\n    , b,\n)\n"), "foo(\n    a,\n    b,\n)\n");
    }
}
