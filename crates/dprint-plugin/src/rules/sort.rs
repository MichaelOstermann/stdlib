//! `perfectionist/sort-imports`, `sort-exports`, `sort-objects`, `sort-interfaces`, `sort-object-types`,
//! `sort-classes`, `sort-jsx-props`, `sort-named-imports` and `sort-named-exports`.
//!
//! Members are sorted by group, then by name in natural order, ignoring case: `a2` comes before `a10`.
//! A spread, `...a`, splits a list in two, since what comes after it can override what came before.
//!
//! A member takes the comments on the lines right above it, and the one at the end of its line, with it.
//! Blank lines and commas stay where they are.
//!
//! A pass sorts one level of nesting: a list inside a member that moves is sorted by the next pass.

use std::cmp::Ordering;

use oxc_ast::ast::*;
use oxc_ast_visit::Visit;
use oxc_ast_visit::walk;
use oxc_parser::Kind;
use oxc_span::GetSpan;
use oxc_span::Span;

use crate::edits::Edits;
use crate::source::Source;
use crate::source::Token;

/// Whether a comment above a member starts a new group that is sorted on its own, as ESLint had it,
/// rather than moving along with the member.
const PARTITION_BY_COMMENT: bool = false;

pub fn run(source: &Source, edits: &mut Edits) {
    let mut comments: Vec<(usize, usize)> = source.program.comments.iter().map(|comment| (comment.span.start as usize, comment.span.end as usize)).collect();
    comments.sort_unstable();
    Sort { text: source.text, tokens: &source.tokens, comments, edits, moved: Vec::new() }.visit_program(source.program);
}

struct Sort<'s> {
    text: &'s str,
    tokens: &'s [Token],
    comments: Vec<(usize, usize)>,
    edits: &'s mut Edits,
    /// The lists that were reordered. Lists nested in them wait for the next pass.
    moved: Vec<(usize, usize)>,
}

/// A member of a list, or something that splits the list in two.
enum Entry {
    Member { span: Span, group: usize, name: String },
    Barrier,
}

/// A member with the comments that travel with it.
struct Unit {
    /// From the first comment above the member to the end of the member, without its comma.
    start: usize,
    end: usize,
    /// Where a comment at the end of the line goes: after the comma, if there is one.
    after: usize,
    trailing: Option<(usize, usize)>,
    group: usize,
    name: String,
    partition: usize,
}

impl Sort<'_> {
    fn slice(&self, span: Span) -> &str {
        &self.text[span.start as usize..span.end as usize]
    }

    fn token_at(&self, offset: usize) -> Option<Token> {
        let index = self.tokens.partition_point(|token| token.start < offset);
        self.tokens.get(index).copied()
    }

    fn token_before(&self, offset: usize) -> Option<Token> {
        let index = self.tokens.partition_point(|token| token.end <= offset);
        index.checked_sub(1).map(|index| self.tokens[index])
    }

    fn multiline(&self, span: Span) -> bool {
        self.slice(span).contains('\n')
    }

    fn comments_between(&self, start: usize, end: usize) -> &[(usize, usize)] {
        let from = self.comments.partition_point(|comment| comment.0 < start);
        let to = self.comments.partition_point(|comment| comment.0 < end);
        &self.comments[from..to]
    }

    fn unit(&self, span: Span, group: usize, name: String, partition: &mut usize) -> Option<Unit> {
        let start = span.start as usize;
        // The member's own span may or may not include the comma or semicolon after it.
        let mut end = span.end as usize;
        while let Some(last) = self.token_before(end).filter(|token| matches!(token.kind, Kind::Comma | Kind::Semicolon) && token.start > start) {
            end = last.start;
        }
        let end = self.token_before(end).map_or(end, |token| token.end);

        // Comments on their own lines right above the member belong to it.
        // What stands above the first statement of a file is its header, not a comment on that statement.
        let Some(before) = self.token_before(start).map(|token| token.end).or((start == 0).then_some(0)) else {
            return self.detached(start, end, group, name, *partition);
        };
        let own_line: Vec<(usize, usize)> = self.comments_between(before, start).iter().copied().filter(|comment| self.text[before..comment.0].contains('\n')).collect();
        let mut unit_start = start;
        if PARTITION_BY_COMMENT {
            if !own_line.is_empty() {
                *partition += 1;
            }
        }
        else {
            for comment in own_line.iter().rev() {
                let gap = &self.text[comment.1..unit_start];
                if gap.matches('\n').count() != 1 || !gap.trim().is_empty() {
                    break;
                }
                unit_start = comment.0;
            }
        }
        // A member with a directive above it is someone's deliberate exception.
        if self.text[unit_start..start].contains("-disable") {
            return None;
        }

        self.detached(unit_start, end, group, name, *partition)
    }

    /// A unit from `start` on, with the comma and the comment that follow it on its line.
    fn detached(&self, start: usize, end: usize, group: usize, name: String, partition: usize) -> Option<Unit> {
        let comma = self.token_at(end).filter(|token| token.kind == Kind::Comma);
        if comma.is_some_and(|comma| !self.text[end..comma.start].is_empty()) {
            return None;
        }
        let after = comma.map_or(end, |comma| comma.end);
        let following = self.token_at(after).map_or(self.text.len(), |token| token.start);
        let trailing = self.comments_between(after, following).first().copied().filter(|comment| !self.text[after..comment.0].contains('\n'));

        Some(Unit { start, end, after, trailing, group, name, partition })
    }

    /// Runs of import statements, and runs of `export ... from` statements, with nothing else between them.
    fn statements(&mut self, body: &[Statement]) {
        let mut imports: Vec<Entry> = Vec::new();
        let mut exports: Vec<Entry> = Vec::new();

        for statement in body {
            let import = match statement {
                Statement::ImportDeclaration(import) => Some(Entry::Member { span: import.span, group: self.import_group(import), name: self.import_name(import) }),
                _ => None,
            };
            let export = match statement {
                Statement::ExportAllDeclaration(export) => Some(Entry::Member { span: export.span, group: 0, name: export.source.value.to_string() }),
                Statement::ExportFromDeclaration(export) => Some(Entry::Member { span: export.span, group: 0, name: export.source.value.to_string() }),
                _ => None,
            };

            if import.is_none() {
                self.list(std::mem::take(&mut imports));
            }
            if export.is_none() {
                self.list(std::mem::take(&mut exports));
            }
            imports.extend(import);
            exports.extend(export);
        }
        self.list(imports);
        self.list(exports);
    }

    fn is_side_effect(&self, import: &ImportDeclaration) -> bool {
        import.specifiers.is_none()
    }

    /// Side-effect imports keep the order they were written in.
    fn import_name(&self, import: &ImportDeclaration) -> String {
        if self.is_side_effect(import) { String::new() } else { import.source.value.to_string() }
    }

    /// Types first (external, internal, relative), then builtin, external, internal, relative, side-effect.
    fn import_group(&self, import: &ImportDeclaration) -> usize {
        const UNKNOWN: usize = 8;
        let source = import.source.value.as_str();
        let is_type = import.import_kind.is_type();
        let base = source.split('/').next().unwrap_or(source);
        let clean = |name: &str| name.trim_start_matches("node:").to_string();

        if self.is_side_effect(import) {
            return 7;
        }
        // In the order the linter tried them: the first kind with a group of its own wins.
        let relative = source == "." || source == "./" || source.starts_with("./") || source.starts_with("..");
        let internal = ["~/", "@/"].iter().any(|prefix| source.len() > prefix.len() && source.starts_with(prefix)) || (source.len() > 1 && source.starts_with('#'));
        let builtin = BUILTIN_MODULES.contains(&clean(source).as_str()) || BUILTIN_MODULES.contains(&clean(base).as_str());
        let external = !internal && !source.starts_with('.') && !source.starts_with('/');

        if relative {
            return if is_type { 2 } else { 6 };
        }
        if internal {
            return if is_type { 1 } else { 5 };
        }
        if builtin {
            return 3;
        }
        if external {
            return if is_type { 0 } else { 4 };
        }
        UNKNOWN
    }

    fn list(&mut self, entries: Vec<Entry>) {
        let mut partition = 0;
        let mut units: Vec<Unit> = Vec::new();
        for entry in entries {
            match entry {
                Entry::Barrier => partition += 1,
                Entry::Member { span, group, name } => match self.unit(span, group, name, &mut partition) {
                    Some(unit) => units.push(unit),
                    None => return,
                },
            }
        }
        let (Some(first), Some(last)) = (units.first(), units.last()) else { return };
        // Letters outside ASCII are ordered by locale rules that aren't available here.
        if units.iter().any(|unit| !unit.name.is_ascii()) {
            return;
        }
        let range = (first.start, last.trailing.map_or(last.after, |trailing| trailing.1));
        if self.moved.iter().any(|moved| moved.0 <= range.0 && range.1 <= moved.1) {
            return;
        }

        let mut order: Vec<usize> = (0..units.len()).collect();
        order.sort_by(|&a, &b| {
            let (a, b) = (&units[a], &units[b]);
            a.partition.cmp(&b.partition).then(a.group.cmp(&b.group)).then_with(|| natural(&a.name, &b.name))
        });
        if order.iter().enumerate().all(|(slot, &unit)| slot == unit) {
            return;
        }

        // A `//` comment at the end of a line can only move to the end of another line.
        let line_comments = units.iter().any(|unit| unit.trailing.is_some());
        let ends_line = |unit: &Unit| {
            let from = unit.trailing.map_or(unit.after, |trailing| trailing.1);
            self.text[from..].split('\n').next().is_some_and(|rest| rest.trim().is_empty())
        };
        if line_comments && !units.iter().all(ends_line) {
            return;
        }

        for (slot, &source) in order.iter().enumerate().filter(|(slot, source)| slot != *source) {
            let (slot, source) = (&units[slot], &units[source]);
            self.edits.replace(slot.start, slot.end, &self.text[source.start..source.end]);
            let comment = source.trailing.map(|trailing| format!(" {}", &self.text[trailing.0..trailing.1])).unwrap_or_default();
            self.edits.replace(slot.after, slot.trailing.map_or(slot.after, |trailing| trailing.1), comment);
        }
        self.moved.push(range);
    }

    /// The members of a class: properties, accessors, the constructor, then methods. Within each kind static
    /// comes first, and public before protected before private.
    ///
    /// Returns nothing for a class where moving a member could change what the code does or how it parses.
    fn class_entries(&self, class: &Class) -> Option<Vec<Entry>> {
        let name = class.id.as_ref().map(|id| id.name.as_str());
        let mut methods: Vec<(String, bool)> = Vec::new();
        let mut entries = Vec::new();

        for element in &class.body.body {
            let span = element.span();
            // A `;` in front of a member guards it against the line before, which would no longer be the same.
            if self.token_before(span.start as usize).is_some_and(|token| token.kind == Kind::Semicolon) {
                return None;
            }

            let (key, is_static, accessibility, kind) = match element {
                ClassElement::TSIndexSignature(_) => {
                    entries.push(Entry::Member { span, group: 0, name: self.slice(span).to_string() });
                    continue;
                }
                ClassElement::MethodDefinition(method) => {
                    // An overload has to stay next to its implementation, and `*a() {}` may not follow a property.
                    let overload = method.value.body.is_none() && !method.r#type.is_abstract();
                    if overload || method.value.generator || method.computed || !method.decorators.is_empty() {
                        return None;
                    }
                    let kind = match method.kind {
                        MethodDefinitionKind::Constructor => MemberKind::Constructor,
                        MethodDefinitionKind::Get | MethodDefinitionKind::Set => MemberKind::Accessor,
                        MethodDefinitionKind::Method => MemberKind::Method,
                    };
                    if kind == MemberKind::Method {
                        let name = (self.key_name(&method.key), method.r#static);
                        if methods.contains(&name) {
                            return None;
                        }
                        methods.push(name);
                    }
                    (&method.key, method.r#static, method.accessibility, kind)
                }
                ClassElement::PropertyDefinition(property) => {
                    if property.computed || !property.decorators.is_empty() {
                        return None;
                    }
                    let function = matches!(property.value, Some(Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_)));
                    // Initializers run from top to bottom, so one that reads another member has to stay below it.
                    if let Some(value) = property.value.as_ref().filter(|_| !function) {
                        let (start, end) = (value.span().start as usize, value.span().end as usize);
                        let from = self.tokens.partition_point(|token| token.start < start);
                        let reads_member = self.tokens[from..].iter().take_while(|token| token.start < end).any(|token| token.kind == Kind::This || Some(&self.text[token.start..token.end]) == name);
                        if reads_member {
                            return None;
                        }
                    }
                    (&property.key, property.r#static, property.accessibility, if function { MemberKind::Method } else { MemberKind::Property })
                }
                // Static blocks and `accessor` properties are rare enough to leave the class alone.
                _ => return None,
            };

            let visibility = match accessibility {
                _ if matches!(key, PropertyKey::PrivateIdentifier(_)) => 2,
                Some(TSAccessibility::Private) => 2,
                Some(TSAccessibility::Protected) => 1,
                _ => 0,
            };
            let group = match (kind, is_static) {
                (MemberKind::Property, true) => 1 + 2 * visibility,
                (MemberKind::Accessor, true) => 2 + 2 * visibility,
                (MemberKind::Property, false) => 8 + 2 * visibility,
                (MemberKind::Accessor, false) => 9 + 2 * visibility,
                (MemberKind::Constructor, _) => 14,
                (MemberKind::Method, true) => 15 + visibility,
                (MemberKind::Method, false) => 18 + visibility,
            };
            entries.push(Entry::Member { span, group, name: self.key_name(key) });
        }
        Some(entries)
    }

    fn key_name(&self, key: &PropertyKey) -> String {
        match key {
            PropertyKey::StaticIdentifier(identifier) => identifier.name.to_string(),
            PropertyKey::StringLiteral(literal) => literal.value.to_string(),
            // A computed key that is just a name, `[symbol]`, sorts by that name.
            PropertyKey::Identifier(identifier) => identifier.name.to_string(),
            _ => self.slice(key.span()).to_string(),
        }
    }

    /// The members of an interface or type literal: index signatures, properties, multi-line properties,
    /// methods, multi-line methods.
    fn signatures(&mut self, members: &[TSSignature]) {
        // The order of call signatures decides which overload TypeScript picks.
        if members.iter().any(|member| matches!(member, TSSignature::TSCallSignatureDeclaration(_) | TSSignature::TSConstructSignatureDeclaration(_))) {
            return;
        }
        let entries = members.iter().map(|member| {
            let span = member.span();
            let text = self.slice(span).trim_end_matches([',', ';']);
            let before_annotation = |annotation: Option<&TSTypeAnnotation>| annotation.map_or(text, |annotation| &self.text[span.start as usize..annotation.span.start as usize]);
            let multiline = self.multiline(span);

            let (group, name) = match member {
                TSSignature::TSIndexSignature(signature) => (0, before_annotation(Some(&signature.type_annotation)).to_string()),
                TSSignature::TSPropertySignature(property) => {
                    let name = match &property.key {
                        PropertyKey::StaticIdentifier(_) | PropertyKey::StringLiteral(_) | PropertyKey::Identifier(_) => self.key_name(&property.key),
                        _ => before_annotation(property.type_annotation.as_deref()).trim_end_matches('?').to_string(),
                    };
                    let method = property.type_annotation.as_ref().is_some_and(|annotation| is_function_type(&annotation.type_annotation));
                    (if method { 3 + usize::from(multiline) } else { 1 + usize::from(multiline) }, name)
                }
                TSSignature::TSMethodSignature(method) => (3 + usize::from(multiline), self.key_name(&method.key)),
                _ => (1 + usize::from(multiline), text.to_string()),
            };
            Entry::Member { span, group, name }
        });
        let entries = entries.collect();
        self.list(entries);
    }
}

#[derive(Clone, Copy, PartialEq)]
enum MemberKind {
    Property,
    Accessor,
    Constructor,
    Method,
}

fn is_function_type(r#type: &TSType) -> bool {
    match r#type {
        TSType::TSFunctionType(_) => true,
        TSType::TSUnionType(union) => union.types.iter().all(is_function_type),
        TSType::TSIntersectionType(intersection) => intersection.types.iter().all(is_function_type),
        _ => false,
    }
}

/// Natural order, ignoring case and whitespace: runs of digits compare as numbers, and sort before letters.
fn natural(a: &str, b: &str) -> Ordering {
    let (a, b) = (chunks(a), chunks(b));
    for (a, b) in a.iter().zip(&b) {
        if a == b {
            continue;
        }
        if a.is_empty() != b.is_empty() {
            return if a.is_empty() { Ordering::Less } else { Ordering::Greater };
        }
        return match (number(a), number(b)) {
            (Some(x), Some(y)) => x.partial_cmp(&y).filter(|order| order.is_ne()).unwrap_or_else(|| a.cmp(b)),
            (Some(_), None) => Ordering::Less,
            (None, Some(_)) => Ordering::Greater,
            (None, None) => a.cmp(b),
        };
    }
    a.len().cmp(&b.len())
}

fn number(chunk: &str) -> Option<f64> {
    chunk.bytes().all(|byte| byte.is_ascii_digit()).then(|| chunk.parse().ok()).flatten()
}

/// Splits a name into alternating runs of digits and of everything else.
fn chunks(name: &str) -> Vec<String> {
    let name: String = name.to_lowercase().chars().filter(|character| !character.is_whitespace()).collect();
    let mut chunks: Vec<String> = Vec::new();
    let mut digits = None;
    for character in name.chars() {
        if digits != Some(character.is_ascii_digit()) {
            chunks.push(String::new());
            digits = Some(character.is_ascii_digit());
        }
        chunks.last_mut().expect("pushed above").push(character);
    }
    chunks
}

const BUILTIN_MODULES: [&str; 45] = [
    "assert", "async_hooks", "buffer", "child_process", "cluster", "console", "constants", "crypto", "dgram", "diagnostics_channel", "dns", "domain", "events", "fs", "http",
    "http2", "https", "inspector", "module", "net", "os", "path", "perf_hooks", "process", "punycode", "querystring", "readline", "repl", "sea", "sqlite", "stream",
    "string_decoder", "sys", "test", "timers", "tls", "trace_events", "tty", "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib",
];

impl<'a> Visit<'a> for Sort<'_> {
    fn visit_program(&mut self, it: &Program<'a>) {
        self.statements(&it.body);
        walk::walk_program(self, it);
    }

    fn visit_class(&mut self, it: &Class<'a>) {
        if let Some(entries) = self.class_entries(it) {
            self.list(entries);
        }
        walk::walk_class(self, it);
    }

    fn visit_object_expression(&mut self, it: &ObjectExpression<'a>) {
        // Properties, methods, multi-line properties, multi-line methods.
        let entries = it.properties.iter().map(|property| match property {
            ObjectPropertyKind::SpreadProperty(_) => Entry::Barrier,
            ObjectPropertyKind::ObjectProperty(property) => {
                let method = matches!(property.value, Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_));
                let group = usize::from(method) + 2 * usize::from(self.multiline(property.span));
                Entry::Member { span: property.span, group, name: self.key_name(&property.key) }
            }
        });
        let entries = entries.collect();
        self.list(entries);
        walk::walk_object_expression(self, it);
    }

    fn visit_object_pattern(&mut self, it: &ObjectPattern<'a>) {
        // A default may read a name bound earlier in the same pattern: `{ a, b = a }`.
        let defaults = it.properties.iter().any(|property| self.slice(property.value.span()).contains('='));
        if !defaults {
            let entries = it.properties.iter().map(|property| {
                let group = 2 * usize::from(self.multiline(property.span));
                Entry::Member { span: property.span, group, name: self.key_name(&property.key) }
            });
            let entries = entries.collect();
            self.list(entries);
        }
        walk::walk_object_pattern(self, it);
    }

    fn visit_ts_interface_body(&mut self, it: &TSInterfaceBody<'a>) {
        self.signatures(&it.body);
        walk::walk_ts_interface_body(self, it);
    }

    fn visit_ts_type_literal(&mut self, it: &TSTypeLiteral<'a>) {
        self.signatures(&it.members);
        walk::walk_ts_type_literal(self, it);
    }

    fn visit_jsx_opening_element(&mut self, it: &JSXOpeningElement<'a>) {
        // Props without a value, then the others, then multi-line props.
        let entries = it.attributes.iter().map(|attribute| match attribute {
            JSXAttributeItem::SpreadAttribute(_) => Entry::Barrier,
            JSXAttributeItem::Attribute(attribute) => {
                let group = if attribute.value.is_none() { 0 } else { 1 + usize::from(self.multiline(attribute.span)) };
                Entry::Member { span: attribute.span, group, name: self.slice(attribute.name.span()).to_string() }
            }
        });
        let entries = entries.collect();
        self.list(entries);
        walk::walk_jsx_opening_element(self, it);
    }

    fn visit_import_declaration(&mut self, it: &ImportDeclaration<'a>) {
        if let Some(specifiers) = &it.specifiers {
            let named = specifiers.iter().filter_map(|specifier| match specifier {
                ImportDeclarationSpecifier::ImportSpecifier(specifier) => Some(Entry::Member { span: specifier.span, group: 0, name: specifier.local.name.to_string() }),
                _ => None,
            });
            let entries = named.collect();
            self.list(entries);
        }
        walk::walk_import_declaration(self, it);
    }

    fn visit_export_named_declaration(&mut self, it: &ExportNamedDeclaration<'a>) {
        let entries = it.specifiers.iter().map(|specifier| Entry::Member { span: specifier.span, group: 0, name: specifier.exported.name().to_string() });
        let entries = entries.collect();
        self.list(entries);
        walk::walk_export_named_declaration(self, it);
    }

    fn visit_export_from_declaration(&mut self, it: &ExportFromDeclaration<'a>) {
        let entries = it.specifiers.iter().map(|specifier| Entry::Member { span: specifier.span, group: 0, name: specifier.exported.name().to_string() });
        let entries = entries.collect();
        self.list(entries);
        walk::walk_export_from_declaration(self, it);
    }
}

#[cfg(test)]
mod tests {
    use std::cmp::Ordering;
    use std::path::Path;

    use super::natural;
    use crate::Configuration;
    use crate::format_text;

    fn format(text: &str) -> String {
        format_text(Path::new("test.tsx"), text, &Configuration::default()).unwrap().unwrap_or_else(|| text.to_string())
    }

    fn unchanged(text: &str) {
        assert_eq!(format(text), text);
    }

    #[test]
    fn natural_order() {
        assert_eq!(natural("a2", "a10"), Ordering::Less);
        assert_eq!(natural("B", "a"), Ordering::Greater);
        assert_eq!(natural("a", "ab"), Ordering::Less);
        assert_eq!(natural("1a", "a"), Ordering::Less);
        assert_eq!(natural("_a", "a"), Ordering::Less);
        assert_eq!(natural("aB", "ab"), Ordering::Equal);
    }

    #[test]
    fn objects() {
        assert_eq!(format("const a = { c: 1, b: 2, a: 3 }\n"), "const a = { a: 3, b: 2, c: 1 }\n");
        assert_eq!(format("const a = {\n    b: 1,\n    a: 2,\n}\n"), "const a = {\n    a: 2,\n    b: 1,\n}\n");
        assert_eq!(format("const a = {\n    c() {},\n    b: {\n        d: 1,\n    },\n    a: 1,\n    e: () => 1,\n}\n"), "const a = {\n    a: 1,\n    c() {},\n    e: () => 1,\n    b: {\n        d: 1,\n    },\n}\n");
        assert_eq!(format("const a = { b: 1, ...c, e: 2, d: 3 }\n"), "const a = { b: 1, ...c, d: 3, e: 2 }\n");
        assert_eq!(format("const a = {\n    b: { d: 1, c: 2 },\n    a: 1,\n}\n"), "const a = {\n    a: 1,\n    b: { c: 2, d: 1 },\n}\n");
        assert_eq!(format("const { c, a, b } = d\n"), "const { a, b, c } = d\n");
        unchanged("const { b, a = b } = c\nconst { d, ...e } = f\n");
        unchanged("const a = { a1: 1, a2: 1, a10: 1, aB: 1, ac: 1, B: 2, c: 3 }\n");
        unchanged("const a = { é: 1, a: 2 }\n");
    }

    #[test]
    fn comments_move_along() {
        assert_eq!(format("const a = {\n    // about b\n    b: 1, // b\n    /** about a */\n    a: 2,\n}\n"), "const a = {\n    /** about a */\n    a: 2,\n    // about b\n    b: 1, // b\n}\n");
        assert_eq!(format("const a = {\n    b: 1,\n\n    // loose\n\n    a: 2, // a\n}\n"), "const a = {\n    a: 2, // a\n    // loose\n    b: 1,\n}\n");
        unchanged("const a = {\n    // eslint-disable-next-line some-rule\n    b: 1,\n    a: 2,\n}\n");
    }

    #[test]
    fn types() {
        assert_eq!(format("interface A {\n    c(): void\n    b: string\n    [key: string]: unknown\n    a: {\n        d: 1\n    }\n    e: () => void\n}\n"), "interface A {\n    [key: string]: unknown\n    b: string\n    a: {\n        d: 1\n    }\n    c(): void\n    e: () => void\n}\n");
        assert_eq!(format("type A = { b: string, a?: number }\n"), "type A = { a?: number, b: string }\n");
        assert_eq!(format("interface A {\n    c: 1\n    [b]: 2\n    a: 3\n}\n"), "interface A {\n    a: 3\n    [b]: 2\n    c: 1\n}\n");
        unchanged("interface A {\n    (b: string): void\n    (a: number): void\n    c: 1\n    a: 2\n}\n");
    }

    #[test]
    fn classes() {
        assert_eq!(
            format("class A {\n    b() {}\n\n    private d = 1\n\n    constructor() {}\n\n    /** About a. */\n    a() {}\n\n    static e = 2\n\n    c = 3\n\n    get f() {\n        return 1\n    }\n\n    static g() {}\n\n    #h = 4\n\n    i = () => 1\n}\n"),
            "class A {\n    static e = 2\n\n    c = 3\n\n    get f() {\n        return 1\n    }\n\n    #h = 4\n\n    private d = 1\n\n    constructor() {}\n\n    static g() {}\n\n    /** About a. */\n    a() {}\n\n    b() {}\n\n    i = () => 1\n}\n",
        );
        // Left alone: an initializer that reads another member, overloads, and a guarding semicolon.
        unchanged("class A {\n    b = 1\n    a = this.b + 1\n}\n");
        unchanged("class A {\n    static b = 1\n    static a = A.b + 1\n}\n");
        unchanged("class A {\n    b(c: string): void\n    b(c: number): void\n    b(c: unknown) {}\n\n    a() {}\n}\n");
        unchanged("class A {\n    b = 1\n    ;[c] = 2\n    a = 3\n}\n");
        unchanged("class A {\n    b() {}\n\n    *a() {}\n}\n");
    }

    #[test]
    fn jsx_props() {
        assert_eq!(format("const a = <B d=\"1\" c e={2} b />\n"), "const a = <B b c d=\"1\" e={2} />\n");
        assert_eq!(format("const a = <B c {...d} b a />\n"), "const a = <B c {...d} a b />\n");
    }

    #[test]
    fn import_statements() {
        assert_eq!(
            format("import \"./side.css\"\nimport { a } from \"./a\"\nimport b from \"b\"\nimport fs from \"node:fs\"\nimport type { C } from \"c\"\nimport type { D } from \"./d\"\nimport e from \"~/e\"\nimport type { F } from \"@/f\"\nimport g from \"../g\"\nimport \"./first\"\n"),
            "import type { C } from \"c\"\nimport type { F } from \"@/f\"\nimport type { D } from \"./d\"\nimport fs from \"node:fs\"\nimport b from \"b\"\nimport e from \"~/e\"\nimport g from \"../g\"\nimport { a } from \"./a\"\nimport \"./side.css\"\nimport \"./first\"\n",
        );
        assert_eq!(format("// header\nimport b from \"b\"\n// about a\nimport a from \"a\" // a\n\nconst c = 1\nimport e from \"e\"\nimport d from \"d\"\n"), "// header\n// about a\nimport a from \"a\" // a\nimport b from \"b\"\n\nconst c = 1\nimport d from \"d\"\nimport e from \"e\"\n");
        assert_eq!(format("import { b } from \"b10\"\nimport { d, c } from \"b2\"\n"), "import { c, d } from \"b2\"\nimport { b } from \"b10\"\n");
        assert_eq!(format("export * from \"./c\"\nexport { a } from \"./a\"\nexport type { B } from \"./b\"\n"), "export { a } from \"./a\"\nexport type { B } from \"./b\"\nexport * from \"./c\"\n");
    }

    #[test]
    fn imports_and_exports() {
        assert_eq!(format("import { c, a as d, b } from \"e\"\n"), "import { b, c, a as d } from \"e\"\n");
        assert_eq!(format("export { c, a as d, b }\nexport { g, f } from \"h\"\n"), "export { b, c, a as d }\nexport { f, g } from \"h\"\n");
        assert_eq!(format("import a, {\n    c,\n    b,\n} from \"d\"\n"), "import a, {\n    b,\n    c,\n} from \"d\"\n");
    }
}
