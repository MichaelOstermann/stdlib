//! `lines-between-class-members`: a blank line follows every class member that spans several lines.
//!
//! Single-line members may be packed together or separated, and overload signatures stay with their implementation.

use oxc_ast::ast::ClassBody;
use oxc_ast::ast::ClassElement;
use oxc_ast_visit::Visit;
use oxc_ast_visit::walk;
use oxc_span::GetSpan;

use crate::edits::Edits;
use crate::source::Source;

pub fn run(source: &Source, edits: &mut Edits) {
    ClassMembers { text: source.text, edits }.visit_program(source.program);
}

struct ClassMembers<'s> {
    text: &'s str,
    edits: &'s mut Edits,
}

impl<'a> Visit<'a> for ClassMembers<'_> {
    fn visit_class_body(&mut self, body: &ClassBody<'a>) {
        for pair in body.body.windows(2) {
            let (start, end) = (pair[0].span().end as usize, pair[1].span().start as usize);
            let multiline = self.text[pair[0].span().start as usize..start].contains('\n');

            if multiline && !is_overload(&pair[0]) && !is_padded(&self.text[start..end]) {
                if let Some(line_end) = line_end(self.text, start) {
                    self.edits.replace(line_end, line_end, "\n");
                }
            }
        }

        walk::walk_class_body(self, body);
    }
}

fn is_overload(element: &ClassElement) -> bool {
    matches!(element, ClassElement::MethodDefinition(method) if method.value.body.is_none())
}

/// Whether the text between two members has a blank line right after the first or right before the second.
/// A blank line between two comments in the middle doesn't count.
fn is_padded(between: &str) -> bool {
    let is_space = |character: char| character.is_whitespace();
    let leading = &between[..between.find(|character| !is_space(character)).unwrap_or(between.len())];
    let trailing = &between[between.rfind(|character| !is_space(character)).map_or(0, |index| index + 1)..];
    leading.matches('\n').count() > 1 || trailing.matches('\n').count() > 1
}

/// The line break ending the line that `from` is on, skipping comments. `None` if more code follows on that line.
fn line_end(text: &str, from: usize) -> Option<usize> {
    let mut rest = &text[from..];
    loop {
        rest = rest.trim_start_matches([' ', '\t', '\r', ';']);
        if rest.starts_with('\n') {
            return Some(text.len() - rest.len());
        }
        else if rest.starts_with("//") {
            rest = &rest[rest.find('\n')?..];
        }
        else if rest.starts_with("/*") {
            rest = &rest[rest.find("*/")? + 2..];
        }
        else {
            return None;
        }
    }
}

#[cfg(test)]
mod tests {
    use crate::testing::format;

    #[test]
    fn after_multiline_member() {
        assert_eq!(format("class A {\n    a() {\n    }\n    b() {\n    }\n}\n"), "class A {\n    a() {\n    }\n\n    b() {\n    }\n}\n");
        assert_eq!(format("class A {\n    a() {\n    } // note\n    b = 1\n}\n"), "class A {\n    b = 1\n    a() {\n    } // note\n}\n");
        assert_eq!(format("class A {\n    a = {\n        b: 1,\n    };\n    c = 1\n}\n"), "class A {\n    a = {\n        b: 1,\n    }\n\n    c = 1\n}\n");
    }

    #[test]
    fn after_single_line_member() {
        assert_eq!(format("class A {\n    a = 1\n    b = 2\n\n    c = 3\n    d() {}\n}\n"), "class A {\n    a = 1\n    b = 2\n\n    c = 3\n    d() {}\n}\n");
    }

    #[test]
    fn already_padded() {
        assert_eq!(format("class A {\n    a() {\n    }\n\n    // note\n    b() {\n    }\n}\n"), "class A {\n    a() {\n    }\n\n    // note\n    b() {\n    }\n}\n");
        assert_eq!(format("class A {\n    a() {\n    }\n    // note\n\n    b() {\n    }\n}\n"), "class A {\n    a() {\n    }\n    // note\n\n    b() {\n    }\n}\n");
    }

    #[test]
    fn comment_before_next_member() {
        assert_eq!(format("class A {\n    a() {\n    }\n    // note\n    b() {\n    }\n}\n"), "class A {\n    a() {\n    }\n\n    // note\n    b() {\n    }\n}\n");
    }

    #[test]
    fn overloads() {
        assert_eq!(format("class A {\n    a(\n        x: string,\n    ): void\n    a(x: unknown) {\n    }\n}\n"), "class A {\n    a(\n        x: string,\n    ): void\n    a(x: unknown) {\n    }\n}\n");
    }

    #[test]
    fn nested_classes() {
        assert_eq!(format("const A = class {\n    a() {\n        return class {\n            b() {\n            }\n            c() {\n            }\n        }\n    }\n}\n"), "const A = class {\n    a() {\n        return class {\n            b() {\n            }\n\n            c() {\n            }\n        }\n    }\n}\n");
    }
}
