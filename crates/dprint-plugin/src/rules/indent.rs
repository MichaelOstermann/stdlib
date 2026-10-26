//! `indent`: four spaces per level, with one principle and no per-construct settings.
//!
//! Every line belongs to the innermost construct that contains its first token and began on an earlier line:
//! a pair of brackets, or any node of the syntax tree. The line is indented one level deeper than the line
//! that construct began on. The token that closes the construct, such as `}`, `)`, `else` or `</div>`,
//! lines up with it instead.
//!
//! Lines that begin inside a template literal are never touched, whether they hold text or code in a
//! `${}`, and the inner lines of a block comment move together with its first line.

use std::collections::HashSet;

use oxc_ast::AstKind;
use oxc_ast::ast::Expression;
use oxc_ast::ast::TSType;
use oxc_ast_visit::Visit;
use oxc_parser::Kind;
use oxc_span::GetSpan;

use crate::edits::Edits;
use crate::source::Item;
use crate::source::Source;

const INDENT: usize = 4;

pub fn run(source: &Source, edits: &mut Edits) {
    let text = source.text;
    let items = source.items();

    let mut containers = Containers { text, list: Vec::new(), cases: HashSet::new() };
    containers.visit_program(source.program);
    containers.brackets(source);
    let mut containers = containers.list;
    // Outer constructs first, so that the innermost is last among those containing a position.
    containers.sort_by(|a, b| a.start.cmp(&b.start).then(b.end.cmp(&a.end)));

    let lines: Vec<usize> = std::iter::once(0).chain(text.match_indices('\n').map(|(index, _)| index + 1)).collect();
    let line_of = |offset: usize| lines.partition_point(|&start| start <= offset) - 1;

    // Literals whose lines must stay as they are, and comments whose inner lines follow the first.
    let literals = literals(&items);
    let comments: Vec<&Item> = items.iter().filter(|item| item.kind.is_none() && text[item.start..item.end].contains('\n')).collect();

    let mut indents: Vec<usize> = Vec::with_capacity(lines.len());
    let mut open: Vec<usize> = Vec::new();
    let mut next_container = 0;
    let mut next_item = 0;

    for (line, &line_start) in lines.iter().enumerate() {
        let line_end = lines.get(line + 1).map_or(text.len(), |&next| next - 1);
        let content = &text[line_start..line_end];
        let current = content.len() - content.trim_start_matches([' ', '\t']).len();
        let first = line_start + current;

        if content.trim().is_empty() || literals.iter().any(|&(start, end)| start < line_start && line_start < end) {
            indents.push(current);
            continue;
        }

        let wanted = if let Some(comment) = comments.iter().find(|comment| comment.start < line_start && line_start < comment.end) {
            // Inside a block comment: keep the line's position relative to the comment's first line.
            let comment_line = line_of(comment.start);
            let before = text[lines[comment_line]..comment.start].len();
            (indents[comment_line] + current).saturating_sub(before)
        }
        else {
            while next_container < containers.len() && containers[next_container].start <= first {
                open.push(next_container);
                next_container += 1;
            }
            open.retain(|&index| containers[index].end > first);

            while next_item < items.len() && items[next_item].start < first {
                next_item += 1;
            }
            let mut token = items.get(next_item).filter(|item| item.start == first);
            let mut first = first;
            // A semicolon guarding a line, `;(a as B).run()`, ends the statement before it. The line belongs
            // to whatever follows the semicolon.
            if let Some(guarded) = items.get(next_item + 1).filter(|next| token.is_some_and(|token| token.kind == Some(Kind::Semicolon)) && next.start < line_end) {
                first = guarded.start;
                token = Some(guarded);
                while next_container < containers.len() && containers[next_container].start <= first {
                    open.push(next_container);
                    next_container += 1;
                }
                open.retain(|&index| containers[index].end > first);
            }

            // A comment on its own line starts where the code after it starts: next to the `else` or the
            // `| B` it describes, not one level deeper.
            if token.is_some_and(|token| token.kind.is_none()) {
                token = items[next_item..].iter().find(|item| item.kind.is_some());
            }

            let container = open.iter().rev().map(|&index| &containers[index]).find(|container| line_of(container.start) < line);
            match container {
                Some(container) if container.shape == Shape::Program => 0,
                Some(container) => indents[line_of(container.start)] + if container.closes_with(text, first, token) { 0 } else { INDENT },
                None => 0,
            }
        };

        indents.push(wanted);
        if content[..current].contains('\t') || wanted != current {
            edits.replace(line_start, first, " ".repeat(wanted));
        }
    }
}

/// The spans of strings and of whole template literals, from the opening backtick to the closing one.
pub fn literals(items: &[Item]) -> Vec<(usize, usize)> {
    let mut literals = Vec::new();
    let mut open: Vec<usize> = Vec::new();
    for item in items {
        match item.kind {
            Some(Kind::Str | Kind::NoSubstitutionTemplate) => literals.push((item.start, item.end)),
            Some(Kind::TemplateHead) => open.push(item.start),
            Some(Kind::TemplateTail) => {
                // Only the outermost template matters: it covers the ones nested in it.
                if let Some(start) = open.pop().filter(|_| open.is_empty()) {
                    literals.push((start, item.end));
                }
            }
            _ => {}
        }
    }
    literals
}

#[derive(Clone, Copy, PartialEq)]
enum Shape {
    Program,
    /// Brackets, closed by the token at this offset.
    Bracket(usize),
    /// `if`, closed for indentation purposes by `else`.
    If,
    /// `try`, by `catch` and `finally`.
    Try,
    /// `do`, by `while`.
    DoWhile,
    /// A JSX element or fragment, closed by its closing tag at this offset.
    Jsx(usize),
    /// A JSX opening tag, closed by its `>` or `/>`.
    JsxOpening,
    /// A union or intersection type written with a leading operator, whose members line up: `| A` then `| B`.
    Leading,
    /// Operands joined by operators. When the first one starts a line, the others line up with it.
    Operands,
    Other,
}

struct Container {
    start: usize,
    end: usize,
    shape: Shape,
}

impl Container {
    fn closes_with(&self, text: &str, offset: usize, token: Option<&Item>) -> bool {
        let kind = token.and_then(|token| token.kind);
        match self.shape {
            Shape::Bracket(closer) | Shape::Jsx(closer) => offset == closer,
            Shape::If => kind == Some(Kind::Else),
            Shape::Try => matches!(kind, Some(Kind::Catch | Kind::Finally)),
            Shape::DoWhile => kind == Some(Kind::While),
            Shape::JsxOpening => text[offset..self.end].trim() == ">" || text[offset..self.end].trim() == "/>",
            Shape::Leading => matches!(kind, Some(Kind::Pipe | Kind::Amp)),
            Shape::Operands => text[..self.start].rsplit('\n').next().is_some_and(|before| before.trim().is_empty()),
            Shape::Program | Shape::Other => false,
        }
    }
}

struct Containers<'s> {
    text: &'s str,
    list: Vec<Container>,
    /// Ternaries that continue a list of cases, `: c ? d`, which line up with the ternary before them.
    cases: HashSet<usize>,
}

impl Containers<'_> {
    /// An alternate that is a ternary with its `?` on its first line continues a list of cases.
    fn case(&mut self, alternate: oxc_span::Span, consequent: oxc_span::Span) {
        if !self.text[alternate.start as usize..consequent.start as usize].contains('\n') {
            self.cases.insert(alternate.start as usize);
        }
    }

    fn leading_operator(&self, offset: usize) -> bool {
        self.text[offset..].starts_with(['|', '&'])
    }

    fn brackets(&mut self, source: &Source) {
        let mut open: Vec<usize> = Vec::new();
        for token in &source.tokens {
            match token.kind {
                Kind::LParen | Kind::LBrack | Kind::LCurly => open.push(token.start),
                Kind::RParen | Kind::RBrack | Kind::RCurly => {
                    if let Some(start) = open.pop() {
                        self.list.push(Container { start, end: token.start + 1, shape: Shape::Bracket(token.start) });
                    }
                }
                _ => {}
            }
        }
    }
}

impl<'a> Visit<'a> for Containers<'_> {
    fn enter_node(&mut self, kind: AstKind<'a>) {
        let span = kind.span();
        match kind {
            AstKind::ConditionalExpression(it) => {
                if let Expression::ConditionalExpression(alternate) = it.alternate.without_parentheses() {
                    self.case(alternate.span, alternate.consequent.span());
                }
            }
            AstKind::TSConditionalType(it) => {
                if let TSType::TSConditionalType(alternate) = &it.false_type {
                    self.case(alternate.span, alternate.true_type.span());
                }
            }
            _ => {}
        }
        if matches!(kind, AstKind::ConditionalExpression(_) | AstKind::TSConditionalType(_)) && self.cases.contains(&(span.start as usize)) {
            return;
        }
        let shape = match kind {
            AstKind::Program(_) => Shape::Program,
            AstKind::IfStatement(_) => Shape::If,
            AstKind::TryStatement(_) => Shape::Try,
            AstKind::DoWhileStatement(_) => Shape::DoWhile,
            AstKind::JSXElement(element) => element.closing_element.as_ref().map_or(Shape::Other, |closing| Shape::Jsx(closing.span.start as usize)),
            AstKind::JSXFragment(fragment) => Shape::Jsx(fragment.closing_fragment.span.start as usize),
            AstKind::JSXOpeningElement(_) => Shape::JsxOpening,
            AstKind::TSTypeParameterInstantiation(_) | AstKind::TSTypeParameterDeclaration(_) => Shape::Bracket(span.end as usize - 1),
            AstKind::TSUnionType(_) | AstKind::TSIntersectionType(_) if self.leading_operator(span.start as usize) => Shape::Leading,
            AstKind::TSUnionType(_) | AstKind::TSIntersectionType(_) | AstKind::BinaryExpression(_) | AstKind::LogicalExpression(_) => Shape::Operands,
            // Text is a child of its element like any other, not a construct of its own.
            AstKind::JSXText(_) => return,
            _ => Shape::Other,
        };
        self.list.push(Container { start: span.start as usize, end: span.end as usize, shape });
    }
}

#[cfg(test)]
mod tests {
    use crate::testing::format_tsx as format;

    /// Formats `text` with all of its indentation removed, and expects it back.
    fn restores(text: &str) {
        let flattened: String = text.lines().map(|line| format!("{}\n", line.trim_start())).collect();
        assert_eq!(format(&flattened), text);
    }

    #[test]
    fn blocks() {
        restores("function f() {\n    if (a) {\n        b()\n    }\n    else if (c) {\n        d()\n    }\n    else {\n        e()\n    }\n}\n");
        restores("try {\n    a()\n}\ncatch {\n    b()\n}\nfinally {\n    c()\n}\n");
        restores("switch (a) {\n    case 1:\n        b()\n        break\n    case 2: {\n        c()\n    }\n    default:\n}\n");
        restores("class A {\n    b = 1\n\n    c() {\n        return 1\n    }\n}\n");
    }

    #[test]
    fn lists() {
        restores("const a = [\n    1,\n    [\n        2,\n    ],\n]\n");
        restores("foo(a, {\n    b: 1,\n})\n");
        restores("foo(\n    a,\n    (b) => {\n        c()\n    },\n)\n");
        restores("function f(\n    a: string,\n    b: number,\n): void {\n    c()\n}\n");
        restores("type A = Map<\n    string,\n    number\n>\n");
    }

    #[test]
    fn continuations() {
        restores("const a = b\n    .c()\n    .d((e) => {\n        f()\n    })\n    .g()\n");
        restores("const a = b\n    && c\n    && d\n");
        restores("const a = b\n    ? c\n    : d\n");
        restores("const a = b ? c\n    : d ? e\n    : f\n");
        restores("const a = b\n    ? c\n    : d\n        ? e\n        : f\n");
        restores("const a =\n    b\n");
        restores("type A =\n    | B\n    | C\n");
        restores("foo((a) => a\n    .b()\n    .c())\n");
        restores("while (\n    a\n) b()\n");
        restores("const a = !(\n    b\n    || c\n    || d\n)\n");
        restores("if (\n    a\n    && b\n) {\n    c()\n}\n");
    }

    #[test]
    fn comments() {
        restores("const a = b\n    // note\n    .c()\n    // note\n    .d()\n");
        restores("if (a) {\n    b()\n}\n// note\nelse {\n    c()\n    // note\n}\n");
        restores("try {\n    a()\n}\n// note\ncatch {\n    b()\n}\n");
        restores("type A =\n    // note\n    | B\n    // note\n    | C\n");
        restores("const a = [\n    // note\n    1,\n    // note\n]\n");
        restores("const a = b\n    // note\n    ? c\n    // note\n    : d\n");
    }

    #[test]
    fn jsx() {
        restores("const a = (\n    <div\n        b=\"c\"\n        d=\"e\"\n    >\n        text\n        {f}\n        <g />\n    </div>\n)\n");
        restores("const a = (\n    <>\n        <b\n            c=\"d\"\n        />\n    </>\n)\n");
        restores("const a = (\n    <b>\n        <c />\n        text\n        {d}\n        more text\n    </b>\n)\n");
    }

    #[test]
    fn left_alone() {
        assert_eq!(format("function f() {\nreturn `a\n  b\n      ${c}\nd`\n}\n"), "function f() {\n    return `a\n  b\n      ${c}\nd`\n}\n");
        assert_eq!(format("function f() {\nreturn `${\na(\nb,\n)}`\n}\n"), "function f() {\n    return `${\na(\nb,\n)}`\n}\n");
        assert_eq!(format("function f() {\n/**\n * a\n */\nb()\n}\n"), "function f() {\n    /**\n     * a\n     */\n    b()\n}\n");
        assert_eq!(format("\tconst a = 1\n"), "const a = 1\n");
    }
}
