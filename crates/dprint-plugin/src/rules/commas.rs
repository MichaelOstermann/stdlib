//! `comma-dangle` and `member-delimiter-style`.
//!
//! A list whose closing bracket sits on its own line ends with a comma, and a list on one line doesn't.
//! Type arguments never end with one, since TypeScript rejects it there.
//! Members of interfaces and type literals are separated by commas on one line, and by nothing but the
//! line break when they are on lines of their own.

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
    Commas { text: source.text, tokens: &source.tokens, edits, jsx: source.program.source_type.is_jsx(), generic_arrow: None }.visit_program(source.program);
}

struct Commas<'s> {
    text: &'s str,
    tokens: &'s [Token],
    edits: &'s mut Edits,
    jsx: bool,
    /// The type parameters of the arrow function being visited, if they are a lone `<T>` in a file with JSX.
    generic_arrow: Option<Span>,
}

impl Commas<'_> {

    /// Adds or removes the comma after the last item of a list. `allowed` is false where a comma is an
    /// error: after a rest element, and after type arguments.
    fn trailing(&mut self, last: Option<Span>, allowed: bool) {
        let Some(last) = last else { return };
        let Some(after) = self.tokens.at(last.end) else { return };

        let comma = (after.kind == Kind::Comma).then_some(after);
        let Some(closing) = comma.map_or(Some(after), |comma| self.tokens.at(comma.end)) else { return };
        if !matches!(closing.kind, Kind::RParen | Kind::RBrack | Kind::RCurly | Kind::RAngle) {
            return;
        }

        let multiline = self.text[last.end as usize..closing.start].contains('\n');
        match comma {
            None if multiline && allowed => self.edits.replace(last.end as usize, last.end as usize, ","),
            Some(comma) if !multiline || !allowed => self.edits.delete(comma.start, comma.end),
            _ => {}
        }
    }

    /// Separators between the members of an interface or type literal.
    fn members(&mut self, body: Span, members: &[TSSignature]) {
        let multiline = self.text[body.start as usize..body.end as usize].contains('\n');

        for index in 0..members.len() {
            let next = members.get(index + 1).map_or(body.end - 1, |next| next.span().start);
            // The separator is the last token before the next member, whether or not the member's span includes it.
            let Some(last) = self.tokens.before(next) else { continue };
            let separator = matches!(last.kind, Kind::Semicolon | Kind::Comma).then_some(last);
            let end = separator.map_or(last.end, |separator| separator.start);

            let is_last = index + 1 == members.len();
            let next_on_same_line = !self.text[end..next as usize].contains('\n');
            let wanted = if !is_last && next_on_same_line { "," } else { "" };
            // On one line the comma is all that separates two members. Across lines the break does.
            let wanted = if multiline || !is_last { wanted } else { "" };

            match separator {
                Some(separator) if self.text[separator.start..separator.end] != *wanted => self.edits.replace(separator.start, separator.end, wanted),
                None if !wanted.is_empty() => self.edits.replace(end, end, wanted),
                _ => {}
            }
        }
    }
}

impl<'a> Visit<'a> for Commas<'_> {
    fn visit_array_expression(&mut self, it: &ArrayExpression<'a>) {
        let last = it.elements.last().filter(|element| !matches!(element, ArrayExpressionElement::Elision(_)));
        self.trailing(last.map(GetSpan::span), true);
        walk::walk_array_expression(self, it);
    }

    fn visit_object_expression(&mut self, it: &ObjectExpression<'a>) {
        self.trailing(it.properties.last().map(GetSpan::span), true);
        walk::walk_object_expression(self, it);
    }

    fn visit_array_pattern(&mut self, it: &ArrayPattern<'a>) {
        match &it.rest {
            Some(rest) => self.trailing(Some(rest.span), false),
            None => self.trailing(it.elements.last().and_then(|element| element.as_ref()).map(GetSpan::span), true),
        }
        walk::walk_array_pattern(self, it);
    }

    fn visit_object_pattern(&mut self, it: &ObjectPattern<'a>) {
        match &it.rest {
            Some(rest) => self.trailing(Some(rest.span), false),
            None => self.trailing(it.properties.last().map(|property| property.span), true),
        }
        walk::walk_object_pattern(self, it);
    }

    fn visit_array_assignment_target(&mut self, it: &ArrayAssignmentTarget<'a>) {
        match &it.rest {
            Some(rest) => self.trailing(Some(rest.span), false),
            None => self.trailing(it.elements.last().and_then(|element| element.as_ref()).map(GetSpan::span), true),
        }
        walk::walk_array_assignment_target(self, it);
    }

    fn visit_object_assignment_target(&mut self, it: &ObjectAssignmentTarget<'a>) {
        match &it.rest {
            Some(rest) => self.trailing(Some(rest.span), false),
            None => self.trailing(it.properties.last().map(GetSpan::span), true),
        }
        walk::walk_object_assignment_target(self, it);
    }

    fn visit_formal_parameters(&mut self, it: &FormalParameters<'a>) {
        match &it.rest {
            Some(rest) => self.trailing(Some(rest.span), false),
            None => self.trailing(it.items.last().map(|parameter| parameter.span), true),
        }
        walk::walk_formal_parameters(self, it);
    }

    fn visit_call_expression(&mut self, it: &CallExpression<'a>) {
        self.trailing(it.arguments.last().map(GetSpan::span), true);
        walk::walk_call_expression(self, it);
    }

    fn visit_new_expression(&mut self, it: &NewExpression<'a>) {
        self.trailing(it.arguments.last().map(GetSpan::span), true);
        walk::walk_new_expression(self, it);
    }

    fn visit_import_declaration(&mut self, it: &ImportDeclaration<'a>) {
        if let Some(specifiers) = &it.specifiers {
            self.trailing(specifiers.last().map(GetSpan::span), true);
        }
        if let Some(clause) = &it.with_clause {
            self.trailing(clause.with_entries.last().map(|entry| entry.span), true);
        }
        walk::walk_import_declaration(self, it);
    }

    fn visit_export_named_declaration(&mut self, it: &ExportNamedDeclaration<'a>) {
        self.trailing(it.specifiers.last().map(|specifier| specifier.span), true);
        walk::walk_export_named_declaration(self, it);
    }

    fn visit_export_from_declaration(&mut self, it: &ExportFromDeclaration<'a>) {
        self.trailing(it.specifiers.last().map(|specifier| specifier.span), true);
        walk::walk_export_from_declaration(self, it);
    }

    fn visit_ts_enum_body(&mut self, it: &TSEnumBody<'a>) {
        self.trailing(it.members.last().map(|member| member.span), true);
        walk::walk_ts_enum_body(self, it);
    }

    fn visit_ts_tuple_type(&mut self, it: &TSTupleType<'a>) {
        self.trailing(it.element_types.last().map(GetSpan::span), true);
        walk::walk_ts_tuple_type(self, it);
    }

    fn visit_ts_type_parameter_instantiation(&mut self, it: &TSTypeParameterInstantiation<'a>) {
        self.trailing(it.params.last().map(GetSpan::span), false);
        walk::walk_ts_type_parameter_instantiation(self, it);
    }

    fn visit_arrow_function_expression(&mut self, it: &ArrowFunctionExpression<'a>) {
        let lone = it.type_parameters.as_ref().filter(|parameters| matches!(parameters.params.as_slice(), [parameter] if parameter.constraint.is_none()));
        self.generic_arrow = lone.filter(|_| self.jsx).map(|parameters| parameters.span);
        walk::walk_arrow_function_expression(self, it);
    }

    fn visit_ts_type_parameter_declaration(&mut self, it: &TSTypeParameterDeclaration<'a>) {
        // Without the comma, `<T,>(a: T) => a` in a `.tsx` file reads as a JSX tag.
        let tag_like = self.generic_arrow == Some(it.span) && !self.text[it.span.start as usize..it.span.end as usize].contains('\n');
        if !tag_like {
            self.trailing(it.params.last().map(|parameter| parameter.span), true);
        }
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

    #[test]
    fn added_when_multiline() {
        assert_eq!(format("const a = [\n    1,\n    2\n]\n"), "const a = [\n    1,\n    2,\n]\n");
        assert_eq!(format("const a = {\n    b: 1,\n    ...c\n}\n"), "const a = {\n    b: 1,\n    ...c,\n}\n");
        assert_eq!(format("foo(\n    a,\n    b\n)\n"), "foo(\n    a,\n    b,\n)\n");
        assert_eq!(format("function f(\n    a: string,\n    b: number\n) {}\n"), "function f(\n    a: string,\n    b: number,\n) {}\n");
        assert_eq!(format("import {\n    a,\n    b\n} from \"a\"\nexport {\n    a,\n    b\n}\n"), "import {\n    a,\n    b,\n} from \"a\"\nexport {\n    a,\n    b,\n}\n");
        assert_eq!(format("enum A {\n    B,\n    C\n}\ntype D = [\n    string,\n    number\n]\n"), "enum A {\n    B,\n    C,\n}\ntype D = [\n    string,\n    number,\n]\n");
        assert_eq!(format("const a = [\n    1,\n    2 // note\n]\n"), "const a = [\n    1,\n    2, // note\n]\n");
    }

    #[test]
    fn removed_on_one_line() {
        assert_eq!(format("const a = [1, 2,]\nconst b = { c: 1, }\nfoo(d, e,)\n"), "const a = [1, 2]\nconst b = { c: 1 }\nfoo(d, e)\n");
        assert_eq!(format("import { a, } from \"a\"\nfunction f(b, c,) {}\n"), "import { a } from \"a\"\nfunction f(b, c) {}\n");
    }

    #[test]
    fn left_alone() {
        assert_eq!(format("const [\n    a,\n    ...b\n] = c\n"), "const [\n    a,\n    ...b\n] = c\n");
        assert_eq!(format("function f(\n    a,\n    ...b\n) {}\n"), "function f(\n    a,\n    ...b\n) {}\n");
        assert_eq!(format("const a = [1, , ]\n"), "const a = [1, ,]\n");
        assert_eq!(format("foo(a, {\n    b,\n})\n"), "foo(a, {\n    b,\n})\n");
        assert_eq!(format("import a from \"a\"\nconst b = (c) => c\nfoo()\n"), "import a from \"a\"\nconst b = (c) => c\nfoo()\n");
    }

    #[test]
    fn type_parameters() {
        assert_eq!(format("type A<B, C,> = [B, C]\nfunction d<E, F,>() {}\nconst g = <H,>(h: H) => h\n"), "type A<B, C> = [B, C]\nfunction d<E, F>() {}\nconst g = <H>(h: H) => h\n");
        assert_eq!(format("type A<\n    B,\n    C,\n> = [B, C]\n"), "type A<\n    B,\n    C,\n> = [B, C]\n");
        let tsx = |text: &str| format_text(Path::new("test.tsx"), text, &Configuration::default()).unwrap().unwrap_or_else(|| text.to_string());
        assert_eq!(tsx("const a = <B,>(b: B) => b\n"), "const a = <B,>(b: B) => b\n");
        assert_eq!(tsx("const a = <B extends C,>(b: B) => b\nconst d = <E, F,>(e: E, f: F) => e\n"), "const a = <B extends C>(b: B) => b\nconst d = <E, F>(e: E, f: F) => e\n");
    }

    #[test]
    fn type_arguments() {
        assert_eq!(format("type A = Map<\n    string,\n    number\n>\n"), "type A = Map<\n    string,\n    number\n>\n");
        assert_eq!(format("type A = Map<\n    string,\n    number,\n>\n"), "type A = Map<\n    string,\n    number\n>\n");
        assert_eq!(format("type A = B<\n    | string\n    | number\n>\n"), "type A = B<\n    | string\n    | number\n>\n");
        assert_eq!(format("const a = f<\n    B,\n>()\nconst c = new D<E,>()\n"), "const a = f<\n    B\n>()\nconst c = new D<E>()\n");
    }

    #[test]
    fn type_members_on_one_line() {
        assert_eq!(format("type A = { a: string; b: number }\n"), "type A = { a: string, b: number }\n");
        assert_eq!(format("type A = { a: string; b: number; }\ninterface B { c: string, }\n"), "type A = { a: string, b: number }\ninterface B { c: string }\n");
        assert_eq!(format("function f(a: { b(): void; c: number }) {}\n"), "function f(a: { c: number, b(): void }) {}\n");
    }

    #[test]
    fn type_members_on_their_own_lines() {
        assert_eq!(format("interface A {\n    a: string;\n    b: number,\n    c(): void;\n}\n"), "interface A {\n    a: string\n    b: number\n    c(): void\n}\n");
        assert_eq!(format("type A = {\n    a: string\n    b: number\n}\n"), "type A = {\n    a: string\n    b: number\n}\n");
        assert_eq!(format("interface A {\n    a: string; b: number;\n    c: boolean;\n}\n"), "interface A {\n    a: string\n    b: number\n    c: boolean\n}\n");
    }
}
