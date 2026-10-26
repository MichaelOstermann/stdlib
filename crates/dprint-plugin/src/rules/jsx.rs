//! The layout of JSX: `jsx-one-expression-per-line`, `jsx-closing-tag-location`, `jsx-curly-newline`,
//! `jsx-curly-brace-presence`, `jsx-wrap-multilines` and `jsx-function-call-newline`.
//!
//! The children of an element follow the first break. With the first child on a new line, every child and
//! the closing tag get a line of their own; otherwise they are joined onto the tag's line. A child that spans
//! several lines spreads out all of them. Where a space between two children on one line would be lost by
//! putting them on separate lines, it is kept as `{" "}`.
//!
//! Braces around a plain string are dropped, `a={"b"}` becomes `a="b"`, and JSX that spans several lines is
//! wrapped in parentheses that sit on lines of their own.

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

const WHITESPACE: [char; 4] = [' ', '\t', '\n', '\r'];
const SPACE: &str = "{\" \"}";

/// Children, braces and the breaks inside `{ }`.
pub fn layout(source: &Source, edits: &mut Edits) {
    Layout { text: source.text, edits }.visit_program(source.program);
}

/// Parentheses around JSX that spans several lines.
pub fn parentheses(source: &Source, edits: &mut Edits) {
    Parentheses { text: source.text, tokens: &source.tokens, edits }.visit_program(source.program);
}

struct Layout<'s> {
    text: &'s str,
    edits: &'s mut Edits,
}

/// A child, or the text of one without the whitespace around it.
struct Piece {
    start: usize,
    end: usize,
}

#[derive(PartialEq)]
enum Gap {
    None,
    Space,
    Break,
}

/// The text of a string that means the same as JSX text or as an attribute value, if there is one.
fn plain_string<'t>(text: &'t str, literal: &StringLiteral) -> Option<&'t str> {
    let raw = &text[literal.span.start as usize..literal.span.end as usize];
    let inner = &raw[1..raw.len() - 1];
    // Invisible characters are only safe to keep where they can be seen: as an escape or between quotes.
    let invisible = |character: char| character.is_control() || (character.is_whitespace() && character != ' ') || matches!(character, '\u{200B}'..='\u{200F}' | '\u{2060}'..='\u{206F}' | '\u{FEFF}');
    (!inner.contains(['\\', '&']) && !inner.contains(invisible)).then_some(inner)
}

impl Layout<'_> {
    fn slice(&self, start: usize, end: usize) -> &str {
        &self.text[start..end]
    }

    fn gap(&self, start: usize, end: usize) -> Gap {
        match self.slice(start, end) {
            "" => Gap::None,
            gap if gap.contains('\n') => Gap::Break,
            _ => Gap::Space,
        }
    }

    /// Whether the text next to a child would run into it across a line break, where JSX adds a space.
    fn text_across_break(&self, neighbour: Option<&JSXChild>, before: bool) -> bool {
        let Some(JSXChild::Text(text)) = neighbour else { return false };
        let raw = self.slice(text.span.start as usize, text.span.end as usize);
        let core = raw.trim_matches(WHITESPACE);
        let edge = if before { &raw[raw.trim_end_matches(WHITESPACE).len()..] } else { &raw[..raw.len() - raw.trim_start_matches(WHITESPACE).len()] };
        !core.is_empty() && edge.contains('\n')
    }

    fn children(&mut self, open_end: usize, close_start: usize, children: &[JSXChild]) {
        let mut pieces: Vec<Piece> = Vec::new();

        for (index, child) in children.iter().enumerate() {
            let (start, end) = (child.span().start as usize, child.span().end as usize);
            match child {
                JSXChild::Text(_) => {
                    let raw = self.slice(start, end);
                    let core = raw.trim_matches(WHITESPACE);
                    if !core.is_empty() {
                        let start = start + raw.len() - raw.trim_start_matches(WHITESPACE).len();
                        pieces.push(Piece { start, end: start + core.len() });
                    }
                }
                JSXChild::ExpressionContainer(container) => {
                    if let JSXExpression::StringLiteral(literal) = &container.expression {
                        // `{" "}` at the end of a line belongs to the child before it.
                        let spaces = !literal.value.is_empty() && literal.value.chars().all(|character| character == ' ');
                        if let Some(last) = pieces.last_mut().filter(|last| spaces && last.end == start) {
                            last.end = end;
                            continue;
                        }

                        // `{"text"}` is just `text`.
                        let plain = plain_string(self.text, literal).filter(|inner| {
                            let safe = !inner.is_empty() && inner.trim() == *inner && !inner.contains(['{', '}', '<', '>']) && !inner.contains("//") && !inner.contains("/*");
                            let previous = index.checked_sub(1).and_then(|index| children.get(index));
                            safe && !self.text_across_break(previous, true) && !self.text_across_break(children.get(index + 1), false)
                        });
                        if let Some(inner) = plain {
                            self.edits.replace(start, end, inner);
                        }
                    }
                    pieces.push(Piece { start, end });
                }
                _ => pieces.push(Piece { start, end }),
            }
        }

        let (Some(first), Some(last)) = (pieces.first(), pieces.last()) else { return };
        let (lead, trail) = ((open_end, first.start), (last.end, close_start));
        let between: Vec<(usize, usize)> = pieces.windows(2).map(|pair| (pair[0].end, pair[1].start)).collect();
        let spread = self.gap(lead.0, lead.1) == Gap::Break || pieces.iter().any(|piece| self.slice(piece.start, piece.end).contains('\n'));

        if spread {
            match self.gap(lead.0, lead.1) {
                Gap::None => self.edits.replace(lead.0, lead.1, "\n"),
                Gap::Space => self.edits.replace(lead.0, lead.1, format!("\n{SPACE}\n")),
                Gap::Break => {}
            }
            for &(start, end) in between.iter().chain([&trail]) {
                match self.gap(start, end) {
                    Gap::None => self.edits.replace(start, end, "\n"),
                    Gap::Space => self.edits.replace(start, end, format!("{SPACE}\n")),
                    Gap::Break => {}
                }
            }
        }
        else {
            for &(start, end) in between.iter().chain([&trail]) {
                if self.gap(start, end) == Gap::Break {
                    self.edits.delete(start, end);
                }
            }
        }
    }
}

impl<'a> Visit<'a> for Layout<'_> {
    fn visit_jsx_element(&mut self, it: &JSXElement<'a>) {
        if let Some(closing) = &it.closing_element {
            self.children(it.opening_element.span.end as usize, closing.span.start as usize, &it.children);
        }
        walk::walk_jsx_element(self, it);
    }

    fn visit_jsx_fragment(&mut self, it: &JSXFragment<'a>) {
        self.children(it.opening_fragment.span.end as usize, it.closing_fragment.span.start as usize, &it.children);
        walk::walk_jsx_fragment(self, it);
    }

    fn visit_jsx_attribute(&mut self, it: &JSXAttribute<'a>) {
        // `a={"b"}` is just `a="b"`.
        if let Some(JSXAttributeValue::ExpressionContainer(container)) = &it.value {
            if let JSXExpression::StringLiteral(literal) = &container.expression {
                let quote = |inner: &str| if !inner.contains('"') { Some('"') } else if !inner.contains('\'') { Some('\'') } else { None };
                if let Some((inner, quote)) = plain_string(self.text, literal).and_then(|inner| Some((inner, quote(inner)?))) {
                    self.edits.replace(container.span.start as usize, container.span.end as usize, format!("{quote}{inner}{quote}"));
                    return;
                }
            }
        }
        walk::walk_jsx_attribute(self, it);
    }

    fn visit_jsx_expression_container(&mut self, it: &JSXExpressionContainer<'a>) {
        // `jsx-curly-newline`: a break after `{` asks for one before `}`, and the other way round.
        if !matches!(it.expression, JSXExpression::EmptyExpression(_)) {
            let (start, end) = (it.span.start as usize + 1, it.span.end as usize - 1);
            let (inner_start, inner_end) = (it.expression.span().start as usize, it.expression.span().end as usize);
            let (before, after) = (self.slice(start, inner_start), self.slice(inner_end, end));
            if before.trim().is_empty() && after.trim().is_empty() {
                match (before.contains('\n'), after.contains('\n')) {
                    (true, false) => self.edits.replace(inner_end, end, "\n"),
                    (false, true) => self.edits.delete(inner_end, end),
                    _ => {}
                }
            }
        }
        walk::walk_jsx_expression_container(self, it);
    }
}

struct Parentheses<'s> {
    text: &'s str,
    tokens: &'s [Token],
    edits: &'s mut Edits,
}

impl Parentheses<'_> {


    fn spans_lines(&self, span: Span) -> bool {
        self.text[span.start as usize..span.end as usize].contains('\n')
    }

    /// Breaks the line on both sides of JSX that already sits between brackets.
    fn own_lines(&mut self, jsx: Span) {
        let (start, end) = (jsx.start as usize, jsx.end as usize);
        let (Some(before), Some(mut after)) = (self.tokens.before(start), self.tokens.at(end)) else { return };
        // A comma stays with the JSX, and the break goes after it.
        let mut end = end;
        if after.kind == Kind::Comma {
            let Some(next) = self.tokens.at(after.end) else { return };
            (end, after) = (after.end, next);
        }
        for (start, end) in [(before.end, start), (end, after.start)] {
            let gap = &self.text[start..end];
            if !gap.contains('\n') && gap.trim().is_empty() {
                self.edits.replace(start, end, "\n");
            }
        }
    }

    /// JSX in a position where it reads as a value: assigned, returned, or one side of a condition.
    fn value(&mut self, expression: &Expression) {
        let (jsx, parenthesized) = match expression {
            Expression::ParenthesizedExpression(parenthesized) => (&parenthesized.expression, true),
            _ => (expression, false),
        };
        let span = jsx.span();
        if !matches!(jsx, Expression::JSXElement(_) | Expression::JSXFragment(_)) || !self.spans_lines(span) {
            return;
        }
        if parenthesized {
            self.own_lines(span);
        }
        else {
            self.edits.replace(span.start as usize, span.start as usize, "(\n");
            self.edits.replace(span.end as usize, span.end as usize, "\n)");
        }
    }
}

impl<'a> Visit<'a> for Parentheses<'_> {
    fn visit_variable_declarator(&mut self, it: &VariableDeclarator<'a>) {
        if let Some(init) = &it.init {
            self.value(init);
        }
        walk::walk_variable_declarator(self, it);
    }

    fn visit_assignment_expression(&mut self, it: &AssignmentExpression<'a>) {
        self.value(&it.right);
        walk::walk_assignment_expression(self, it);
    }

    fn visit_return_statement(&mut self, it: &ReturnStatement<'a>) {
        if let Some(argument) = &it.argument {
            self.value(argument);
        }
        walk::walk_return_statement(self, it);
    }

    fn visit_arrow_function_expression(&mut self, it: &ArrowFunctionExpression<'a>) {
        if let Some(body) = it.body.as_expression() {
            self.value(body);
        }
        walk::walk_arrow_function_expression(self, it);
    }

    fn visit_conditional_expression(&mut self, it: &ConditionalExpression<'a>) {
        self.value(&it.consequent);
        self.value(&it.alternate);
        walk::walk_conditional_expression(self, it);
    }

    fn visit_logical_expression(&mut self, it: &LogicalExpression<'a>) {
        self.value(&it.right);
        walk::walk_logical_expression(self, it);
    }

    fn visit_call_expression(&mut self, it: &CallExpression<'a>) {
        // `jsx-function-call-newline`: JSX that spans lines doesn't share them with the call around it.
        for argument in &it.arguments {
            if matches!(argument, Argument::JSXElement(_) | Argument::JSXFragment(_)) && self.spans_lines(argument.span()) {
                self.own_lines(argument.span());
            }
        }
        walk::walk_call_expression(self, it);
    }
}

#[cfg(test)]
mod tests {
    use crate::testing::format_tsx as format;
    use crate::testing::unchanged_tsx as unchanged;

    #[test]
    fn children_spread() {
        assert_eq!(format("const a = (\n    <b>\n        c<d />{e}</b>\n)\n"), "const a = (\n    <b>\n        c\n        <d />\n        {e}\n    </b>\n)\n");
        assert_eq!(format("const a = (\n    <b>\n        c <d /> {e}\n    </b>\n)\n"), "const a = (\n    <b>\n        c{\" \"}\n        <d />{\" \"}\n        {e}\n    </b>\n)\n");
        assert_eq!(format("const a = (\n    <>\n        <b /><c />\n    </>\n)\n"), "const a = (\n    <>\n        <b />\n        <c />\n    </>\n)\n");
        assert_eq!(format("const a = (\n    <b><c>\n        d\n    </c></b>\n)\n"), "const a = (\n    <b>\n        <c>\n            d\n        </c>\n    </b>\n)\n");
        assert_eq!(format("const a = (\n    <b>{c.map((d) => (\n        <e />\n    ))}</b>\n)\n"), "const a = (\n    <b>\n        {c.map((d) => (\n            <e />\n        ))}\n    </b>\n)\n");
        unchanged("const a = (\n    <b>\n        c{\" \"}\n        <d />\n        some more\n        text\n    </b>\n)\n");
    }

    #[test]
    fn children_joined() {
        assert_eq!(format("const a = (\n    <b>c\n        <d />\n    </b>\n)\n"), "const a = (\n    <b>c<d /></b>\n)\n");
        assert_eq!(format("const a = (\n    <b>{c}\n    </b>\n)\n"), "const a = (\n    <b>{c}</b>\n)\n");
        unchanged("const a = <b>c <d /> {e}</b>\nconst f = <g> h </g>\nconst i = <j></j>\n");
    }

    #[test]
    fn braces_around_strings() {
        assert_eq!(format("const a = <b c={\"d\"} e={'f'} g={\"it's\"} />\n"), "const a = <b c=\"d\" e=\"f\" g=\"it's\" />\n");
        assert_eq!(format("const a = <b>{\"c\"}</b>\nconst d = <e>f {\"g\"} h</e>\n"), "const a = <b>c</b>\nconst d = <e>f g h</e>\n");
        unchanged("const a = <b c={\"d\\n\"} e={`f`} g={\"&amp;\"} />\n");
        unchanged("const a = <b>{\" \"}{\"c \"}{\"{\"}{\"<\"}{\"\u{FEFF}\"}</b>\n");
        unchanged("const a = (\n    <b>\n        c\n        {\"d\"}\n    </b>\n)\n");
    }

    #[test]
    fn curly_newlines() {
        assert_eq!(format("const a = (\n    <b>\n        {\n            c}\n    </b>\n)\n"), "const a = (\n    <b>\n        {\n            c\n        }\n    </b>\n)\n");
        assert_eq!(format("const a = (\n    <b>\n        {c\n        }\n    </b>\n)\n"), "const a = (\n    <b>\n        {c}\n    </b>\n)\n");
    }

    #[test]
    fn parentheses() {
        assert_eq!(format("const a = <b>\n    c\n</b>\n"), "const a = (\n    <b>\n        c\n    </b>\n)\n");
        assert_eq!(format("function f() {\n    return <b>\n        c\n    </b>\n}\n"), "function f() {\n    return (\n        <b>\n            c\n        </b>\n    )\n}\n");
        assert_eq!(format("let a = () => <b>\n    c\n</b>\n"), "let a = () => (\n    <b>\n        c\n    </b>\n)\n");
        assert_eq!(format("const a = b ? <c>\n    d\n</c> : <e />\n"), "const a = b ? (\n    <c>\n        d\n    </c>\n) : <e />\n");
        assert_eq!(format("const a = b && <c>\n    d\n</c>\n"), "const a = b && (\n    <c>\n        d\n    </c>\n)\n");
        assert_eq!(format("const a = (<b>\n    c\n</b>)\n"), "const a = (\n    <b>\n        c\n    </b>\n)\n");
        assert_eq!(format("foo(<b>\n    c\n</b>)\n"), "foo(\n    <b>\n        c\n    </b>,\n)\n");
        assert_eq!(format("foo(<b>\n    c\n</b>, d)\n"), "foo(\n    <b>\n        c\n    </b>,\n    d,\n)\n");
        unchanged("const a = <b />\nconst c = (<d />)\nconst e = (\n    <f>\n        g\n    </f>\n)\n");
    }
}
