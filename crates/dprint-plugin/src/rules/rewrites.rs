//! `antfu/top-level-function` and `antfu/import-dedupe`: the two rules that rewrite code.
//!
//! A function assigned to a top-level constant becomes a function declaration:
//! `const f = (a) => { ... }` turns into `function f(a) { ... }`. A constant with a type annotation is left
//! alone, and so is an arrow function that fits on one line, `const f = (a) => a + 1`.
//!
//! A name imported twice in one statement, `import { a, a } from "b"`, is imported once.

use std::collections::HashSet;

use oxc_ast::ast::*;
use oxc_parser::Kind;
use oxc_span::GetSpan;
use oxc_span::Span;

use crate::edits::Edits;
use crate::source::Source;

pub fn functions(source: &Source, edits: &mut Edits) {
    for statement in &source.program.body {
        let declaration = match statement {
            Statement::VariableDeclaration(declaration) => declaration,
            Statement::ExportDeclaration(export) => match &export.declaration {
                Declaration::VariableDeclaration(declaration) => declaration,
                _ => continue,
            },
            _ => continue,
        };
        if let Some(function) = declared_function(source, declaration) {
            edits.replace(declaration.span.start as usize, declaration.span.end as usize, function);
        }
    }
}

/// The function declaration that says the same as `const name = <function>`, if there is one.
fn declared_function(source: &Source, declaration: &VariableDeclaration) -> Option<String> {
    let text = |span: Span| &source.text[span.start as usize..span.end as usize];
    let [declarator] = declaration.declarations.as_slice() else { return None };
    if declaration.kind != VariableDeclarationKind::Const || declaration.declare || declarator.type_annotation.is_some() {
        return None;
    }
    let BindingPattern::BindingIdentifier(name) = &declarator.id else { return None };

    // The parts of the declaration that are carried over. Anything else in it must not be a comment.
    let (is_async, type_parameters, parameters, return_type, body_span, body) = match declarator.init.as_ref()? {
        Expression::ArrowFunctionExpression(arrow) => {
            let (body_span, body) = match &arrow.body {
                ArrowFunctionBody::FunctionBody(body) => (body.span, text(body.span).to_string()),
                _ => {
                    // The body is an expression, in parentheses or not. What follows the `=>` is the whole of it.
                    let after_head = arrow.return_type.as_ref().map_or(arrow.params.span.end, |return_type| return_type.span.end) as usize;
                    let tokens = &source.tokens;
                    let arrow_token = tokens.get(tokens.partition_point(|token| token.start < after_head)).filter(|token| token.kind == Kind::Arrow)?;
                    let first = tokens.get(tokens.partition_point(|token| token.start < arrow_token.end))?;
                    let span = Span::new(first.start as u32, arrow.span.end);
                    // On one line, `const f = (a) => a + 1` reads better as it is.
                    if !source.text[name.span.start as usize..span.end as usize].contains('\n') {
                        return None;
                    }
                    (span, format!("{{\nreturn {}\n}}", text(span)))
                }
            };
            (arrow.r#async, arrow.type_parameters.as_ref().map(|it| it.span), arrow.params.span, arrow.return_type.as_ref().map(|it| it.span), body_span, body)
        }
        Expression::FunctionExpression(function) => {
            let body = function.body.as_ref()?;
            // A generator, or a function with a name of its own, isn't the same thing under another name.
            if function.generator || function.id.is_some() || function.this_param.is_some() {
                return None;
            }
            (function.r#async, function.type_parameters.as_ref().map(|it| it.span), function.params.span, function.return_type.as_ref().map(|it| it.span), body.span, text(body.span).to_string())
        }
        _ => return None,
    };
    if !text(parameters).starts_with('(') {
        return None;
    }

    // An arrow function takes `this` and `arguments` from around it, and a declaration brings its own.
    let from = source.tokens.partition_point(|token| token.start < parameters.start as usize);
    let own_scope = source.tokens[from..].iter().take_while(|token| token.start < body_span.end as usize).any(|token| token.kind == Kind::This || &source.text[token.start..token.end] == "arguments");
    if own_scope {
        return None;
    }

    let kept = [type_parameters, Some(parameters), return_type, Some(body_span)];
    let lost_comment = source.program.comments.iter().any(|comment| {
        let inside = declaration.span.start <= comment.span.start && comment.span.end <= declaration.span.end;
        inside && !kept.iter().flatten().any(|span| span.start <= comment.span.start && comment.span.end <= span.end)
    });
    if lost_comment {
        return None;
    }

    let prefix = if is_async { "async " } else { "" };
    Some(format!("{prefix}function {}{}{}{} {body}", name.name, type_parameters.map_or("", text), text(parameters), return_type.map_or("", text)))
}

pub fn dedupe(source: &Source, edits: &mut Edits) {
    for statement in &source.program.body {
        let Statement::ImportDeclaration(import) = statement else { continue };
        let Some(specifiers) = &import.specifiers else { continue };

        let mut names = HashSet::new();
        for specifier in specifiers {
            if names.insert(specifier.local().name.as_str()) {
                continue;
            }
            // The duplicate goes together with the comma after it, or the one before it.
            let (start, end) = (specifier.span().start as usize, specifier.span().end as usize);
            let tokens = &source.tokens;
            let after = tokens.get(tokens.partition_point(|token| token.start < end)).filter(|token| token.kind == Kind::Comma);
            let before = tokens.partition_point(|token| token.end <= start).checked_sub(1).map(|index| tokens[index]).filter(|token| token.kind == Kind::Comma);
            match (after, before) {
                (Some(comma), _) => edits.delete(start, comma.end),
                (None, Some(comma)) => edits.delete(comma.start, end),
                _ => {}
            }
        }
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
    fn top_level_functions() {
        assert_eq!(format("const f = (a: string): number => {\n    return 1\n}\n"), "function f(a: string): number {\n    return 1\n}\n");
        assert_eq!(format("export const f = async <T,>(a: T) => {\n    await a\n}\n"), "export async function f<T,>(a: T) {\n    await a\n}\n");
        assert_eq!(format("const f = a => {\n    return a\n}\n"), "function f(a) {\n    return a\n}\n");
        assert_eq!(format("const f = function (a) {\n    return a\n}\n"), "function f(a) {\n    return a\n}\n");
        assert_eq!(format("const f = (a) => g(\n    a,\n)\n"), "function f(a) {\n    return g(\n        a,\n    )\n}\n");
        assert_eq!(format("const f = () => ({\n    a: 1,\n})\n"), "function f() {\n    return ({\n        a: 1,\n    })\n}\n");
    }

    #[test]
    fn functions_left_alone() {
        unchanged("const f = (a) => a + 1\n");
        unchanged("const f: F = (a) => {\n    return a\n}\n");
        unchanged("let f = (a) => {\n    return a\n}\n");
        unchanged("const f = () => {\n    return this\n}\n");
        unchanged("const f = function g() {\n    return 1\n}\n");
        unchanged("const f = /* why */ () => {\n    return 1\n}\n");
        unchanged("function g() {\n    const f = () => {\n        return 1\n    }\n}\n");
        unchanged("const f = () => {\n    return 1\n}, g = 2\n");
    }

    #[test]
    fn duplicate_imports() {
        assert_eq!(format("import { a, b, a } from \"c\"\n"), "import { a, b } from \"c\"\n");
        assert_eq!(format("import { a, a, b } from \"c\"\n"), "import { a, b } from \"c\"\n");
        assert_eq!(format("import {\n    a,\n    b,\n    a,\n} from \"c\"\n"), "import {\n    a,\n    b,\n} from \"c\"\n");
        unchanged("import { a, b as c } from \"d\"\n");
    }
}
