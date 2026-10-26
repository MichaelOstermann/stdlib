//! `quotes` and `jsx-quotes`: strings use double quotes, unless another quote avoids escaping.
//!
//! A string containing `"` uses single quotes, and one containing both uses a template literal where the
//! syntax allows it. Otherwise whichever of the two quotes needs fewer escapes wins. Template literals
//! that are already there are left alone.

use oxc_ast::ast::Expression;
use oxc_ast::ast::JSXAttributeValue;
use oxc_ast::ast::PropertyKey;
use oxc_ast_visit::Visit;
use oxc_ast_visit::walk;
use oxc_parser::Kind;
use rustc_hash::FxHashSet;

use crate::edits::Edits;
use crate::source::Source;

pub fn run(source: &Source, edits: &mut Edits) {
    let mut context = Context::default();
    context.visit_program(source.program);

    for token in source.tokens.iter().filter(|token| token.kind == Kind::Str) {
        let raw = &source.text[token.start..token.end];
        let requoted = if context.jsx.contains(&token.start) { requote_jsx(raw) } else { requote(raw, context.expressions.contains(&token.start)) };
        if let Some(requoted) = requoted {
            edits.replace(token.start, token.end, requoted);
        }
    }
}

#[derive(Default)]
struct Context {
    /// Strings that are plain expressions, where a template literal means the same.
    expressions: FxHashSet<usize>,
    /// Strings that are JSX attribute values, where a backslash doesn't escape anything.
    jsx: FxHashSet<usize>,
}

impl<'a> Visit<'a> for Context {
    fn visit_expression(&mut self, it: &Expression<'a>) {
        if let Expression::StringLiteral(string) = it {
            self.expressions.insert(string.span.start as usize);
        }
        walk::walk_expression(self, it);
    }

    fn visit_property_key(&mut self, it: &PropertyKey<'a>) {
        // A key is an expression in the AST, but `{ `a`: 1 }` isn't valid.
        if !matches!(it, PropertyKey::StringLiteral(_)) {
            walk::walk_property_key(self, it);
        }
    }

    fn visit_jsx_attribute_value(&mut self, it: &JSXAttributeValue<'a>) {
        if let JSXAttributeValue::StringLiteral(string) = it {
            self.jsx.insert(string.span.start as usize);
        }
        walk::walk_jsx_attribute_value(self, it);
    }
}

fn requote_jsx(raw: &str) -> Option<String> {
    let content = &raw[1..raw.len() - 1];
    (raw.starts_with('\'') && !content.contains('"')).then(|| format!("\"{content}\""))
}

fn requote(raw: &str, template_allowed: bool) -> Option<String> {
    let quote = raw.chars().next()?;
    let content = &raw[1..raw.len() - 1];

    // What the string's value contains, whether or not it is currently escaped.
    let (mut doubles, mut singles, mut backticks) = (0, 0, 0);
    let mut template_unsafe = false;
    let mut characters = content.chars().peekable();
    while let Some(character) = characters.next() {
        let character = if character == '\\' {
            let escaped = characters.next()?;
            // Octal escapes aren't allowed in template literals.
            template_unsafe |= escaped.is_ascii_digit() && (escaped != '0' || characters.peek().is_some_and(char::is_ascii_digit));
            escaped
        }
        else {
            template_unsafe |= character == '$' && characters.peek() == Some(&'{');
            character
        };
        match character {
            '"' => doubles += 1,
            '\'' => singles += 1,
            '`' => backticks += 1,
            _ => {}
        }
    }

    let target = if doubles == 0 {
        '"'
    }
    else if singles == 0 {
        '\''
    }
    else if template_allowed && backticks == 0 && !template_unsafe {
        '`'
    }
    else if singles < doubles {
        '\''
    }
    else {
        '"'
    };

    if target == quote {
        return None;
    }

    let mut requoted = String::with_capacity(raw.len());
    requoted.push(target);
    let mut characters = content.chars();
    while let Some(character) = characters.next() {
        if character == '\\' {
            let escaped = characters.next()?;
            // Quotes that no longer need their escape lose it.
            if !matches!(escaped, '"' | '\'' | '`') || escaped == target {
                requoted.push('\\');
            }
            requoted.push(escaped);
        }
        else {
            if character == target {
                requoted.push('\\');
            }
            requoted.push(character);
        }
    }
    requoted.push(target);
    Some(requoted)
}

#[cfg(test)]
mod tests {
    use crate::testing::format_tsx as format;

    #[test]
    fn double_by_default() {
        assert_eq!(format("const a = 'b'\n"), "const a = \"b\"\n");
        assert_eq!(format("import a from 'a'\n"), "import a from \"a\"\n");
        assert_eq!(format("const a = 'it\\'s'\n"), "const a = \"it's\"\n");
        assert_eq!(format("const a = \"b\\n\\\\c\"\n"), "const a = \"b\\n\\\\c\"\n");
    }

    #[test]
    fn single_to_avoid_escapes() {
        assert_eq!(format("const a = \"say \\\"hi\\\"\"\n"), "const a = 'say \"hi\"'\n");
        assert_eq!(format("const a = 'say \"hi\"'\n"), "const a = 'say \"hi\"'\n");
    }

    #[test]
    fn template_when_both_quotes_appear() {
        assert_eq!(format("const a = \"it's \\\"here\\\"\"\n"), "const a = `it's \"here\"`\n");
        assert_eq!(format("const a = 'it\\'s \"here\"'\n"), "const a = `it's \"here\"`\n");
    }

    #[test]
    fn template_not_possible() {
        // Fewer escapes wins, and a tie goes to double quotes.
        assert_eq!(format("const a = 'it\\'s `a` \"b\" \"c\"'\n"), "const a = 'it\\'s `a` \"b\" \"c\"'\n");
        assert_eq!(format("const a = 'it\\'s ${a} \"b\"'\n"), "const a = 'it\\'s ${a} \"b\"'\n");
        assert_eq!(format("const a = { 'it\\'s \"b\"': 1 }\n"), "const a = { 'it\\'s \"b\"': 1 }\n");
        assert_eq!(format("type A = 'it\\'s \"b\"'\n"), "type A = 'it\\'s \"b\"'\n");
        assert_eq!(format("type A = 'it\\'s \"b'\n"), "type A = \"it's \\\"b\"\n");
    }

    #[test]
    fn existing_templates_are_kept() {
        assert_eq!(format("const a = `plain`\n"), "const a = `plain`\n");
    }

    #[test]
    fn jsx_attributes() {
        assert_eq!(format("const a = <b c='d' e='say \"hi\"' f=\"it's\" />\n"), "const a = <b c=\"d\" e='say \"hi\"' f=\"it's\" />\n");
    }
}
