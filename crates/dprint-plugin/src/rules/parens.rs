//! Parentheses: `arrow-parens`, `new-parens`, `no-extra-parens` and `wrap-iife`.
//!
//! - `(a) => a`, never `a => a`, and `new Foo()`, never `new Foo`.
//! - A function used as a value has no parentheses around it: `const f = function () {}`.
//! - A function that is called on the spot has them: `(function () {})()`.

use oxc_ast::ast::*;
use oxc_ast_visit::Visit;
use oxc_ast_visit::walk;
use oxc_parser::Kind;
use oxc_span::GetSpan;

use crate::edits::Edits;
use crate::source::Source;
use crate::source::Tokens;

/// Parentheses that leave the syntax tree as it is: around arrow parameters and after `new`.
pub fn run(source: &Source, edits: &mut Edits) {
    Parens { source, edits, functions: false }.visit_program(source.program);
}

/// Parentheses around functions. The parser notes whether a function is wrapped, so these are a pass of
/// their own with a check of their own.
pub fn functions(source: &Source, edits: &mut Edits) {
    Parens { source, edits, functions: true }.visit_program(source.program);
}

struct Parens<'s> {
    source: &'s Source<'s>,
    edits: &'s mut Edits,
    /// Which of the two passes this is.
    functions: bool,
}

impl Parens<'_> {
    fn wrap(&mut self, expression: &Expression) {
        let (start, end) = (expression.span().start as usize, expression.span().end as usize);
        self.edits.replace(start, start, "(");
        self.edits.replace(end, end, ")");
    }

    /// `no-extra-parens`: a function in a place where it can only be a value needs no parentheses.
    fn value(&mut self, expression: &Expression) {
        let Expression::ParenthesizedExpression(parenthesized) = expression else { return };
        if !self.functions {
            return;
        }
        let mut inner = &parenthesized.expression;
        while let Expression::ParenthesizedExpression(next) = inner {
            inner = &next.expression;
        }
        if !matches!(inner, Expression::FunctionExpression(_)) {
            return;
        }
        let (start, end) = (parenthesized.span.start as usize, parenthesized.span.end as usize);
        let (inner_start, inner_end) = (inner.span().start as usize, inner.span().end as usize);
        // Only parentheses and whitespace may go: a comment between them stays, and so do they.
        let removable = |text: &str| text.chars().all(|character| character.is_whitespace() || character == '(' || character == ')');
        if removable(&self.source.text[start..inner_start]) && removable(&self.source.text[inner_end..end]) {
            self.edits.delete(start, inner_start);
            self.edits.delete(inner_end, end);
        }
    }

    /// `wrap-iife`: a function that is called where it stands, directly or through `.call()` and `.apply()`.
    fn callee(&mut self, callee: &Expression) {
        if !self.functions {
            return;
        }
        match callee {
            Expression::FunctionExpression(_) => self.wrap(callee),
            Expression::StaticMemberExpression(member) if matches!(member.property.name.as_str(), "call" | "apply") && matches!(member.object, Expression::FunctionExpression(_)) => {
                self.wrap(&member.object);
            }
            _ => {}
        }
    }
}

impl<'a> Visit<'a> for Parens<'_> {
    fn visit_call_expression(&mut self, it: &CallExpression<'a>) {
        self.callee(&it.callee);
        for argument in &it.arguments {
            if let Some(expression) = argument.as_expression() {
                self.value(expression);
            }
        }
        walk::walk_call_expression(self, it);
    }

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

    fn visit_object_property(&mut self, it: &ObjectProperty<'a>) {
        self.value(&it.value);
        walk::walk_object_property(self, it);
    }

    fn visit_return_statement(&mut self, it: &ReturnStatement<'a>) {
        if let Some(argument) = &it.argument {
            self.value(argument);
        }
        walk::walk_return_statement(self, it);
    }

    fn visit_arrow_function_expression(&mut self, it: &ArrowFunctionExpression<'a>) {
        let (start, end) = (it.params.span.start as usize, it.params.span.end as usize);
        if !self.functions && !self.source.text[start..].starts_with('(') {
            self.edits.replace(start, start, "(");
            self.edits.replace(end, end, ")");
        }
        walk::walk_arrow_function_expression(self, it);
    }

    fn visit_new_expression(&mut self, it: &NewExpression<'a>) {
        for argument in &it.arguments {
            if let Some(expression) = argument.as_expression() {
                self.value(expression);
            }
        }
        let after_callee = it.type_arguments.as_ref().map_or(it.callee.span().end, |arguments| arguments.span.end) as usize;
        let next = self.source.tokens.at(after_callee);
        let has_arguments = next.is_some_and(|token| token.kind == Kind::LParen && token.start < it.span.end as usize);
        if !has_arguments && !self.functions {
            self.edits.replace(it.span.end as usize, it.span.end as usize, "()");
        }
        walk::walk_new_expression(self, it);
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
    fn arrow_parameters() {
        assert_eq!(format("let a = b => b\nlet c = d => {}\nlet e = async f => f\n"), "let a = (b) => b\nlet c = (d) => {}\nlet e = async (f) => f\n");
        assert_eq!(format("a.map(b => b.c).filter(d => d)\n"), "a.map((b) => b.c).filter((d) => d)\n");
        assert_eq!(format("const a = (b) => b\nconst c = () => 1\nconst d = (e, f) => e\nconst g = (h: string) => h\n"), "const a = (b) => b\nconst c = () => 1\nconst d = (e, f) => e\nconst g = (h: string) => h\n");
        assert_eq!(format("const a = b => c => d => b\n"), "const a = (b) => (c) => (d) => b\n");
    }

    #[test]
    fn functions_as_values() {
        assert_eq!(format("let a = (function () {})
a = ((function () {}))
foo((function () {}), 1)
"), "let a = function () {}
a = function () {}
foo(function () {}, 1)
");
        assert_eq!(format("let a = { b: (function () {}) }
function c() {
    return (function () {})
}
"), "let a = { b: function () {} }
function c() {
    return function () {}
}
");
        assert_eq!(format("let a = (/* why */ function () {})
let b = (() => 1)
let c = (d)
"), "let a = (/* why */ function () {})
let b = (() => 1)
let c = (d)
");
    }

    #[test]
    fn immediately_invoked() {
        assert_eq!(format("let a = function () {}()
let b = function () {}.call(c)
"), "let a = (function () {})()
let b = (function () {}).call(c)
");
        assert_eq!(format(";(function () {})()
let a = (function () {})()
let b = (() => 1)()
"), ";(function () {})()
let a = (function () {})()
let b = (() => 1)()
");
    }

    #[test]
    fn new_expressions() {
        assert_eq!(format("const a = new Foo\nconst b = new Foo.Bar\nconst c = new Foo<T>\n"), "const a = new Foo()\nconst b = new Foo.Bar()\nconst c = new Foo<T>()\n");
        assert_eq!(format("const a = new Foo()\nconst b = new (foo())()\nconst c = new Foo(new Bar)\n"), "const a = new Foo()\nconst b = new (foo())()\nconst c = new Foo(new Bar())\n");
    }
}
