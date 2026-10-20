//! Spacing between two tokens on the same line.
//!
//! Covers `space-in-parens`, `array-bracket-spacing`, `computed-property-spacing`, `object-curly-spacing`,
//! `block-spacing`, `template-curly-spacing`, `rest-spread-spacing`, `no-whitespace-before-property`,
//! `comma-spacing`, `semi-spacing`, `key-spacing`, `type-annotation-spacing`, `type-generic-spacing`,
//! `type-named-tuple-spacing`, `space-infix-ops`, `space-unary-ops`, `arrow-spacing`, `keyword-spacing`,
//! `space-before-blocks`, `space-before-function-paren`, `generator-star-spacing`, `yield-star-spacing`,
//! `template-tag-spacing`, `no-multi-spaces`, and the spacing of calls, which ESLint left alone.

use std::collections::HashSet;

use oxc_ast::ast::*;
use oxc_ast_visit::Visit;
use oxc_ast_visit::walk;
use oxc_parser::Kind;
use oxc_span::GetSpan;
use oxc_span::Span;
use oxc_syntax::scope::ScopeFlags;

use crate::edits::Edits;
use crate::source::Item;
use crate::source::Source;
use crate::source::Token;

pub fn run(source: &Source, edits: &mut Edits) {
    let mut context = Context::new(source);
    context.visit_program(source.program);

    let items = source.items();
    for pair in items.windows(2) {
        let (left, right) = (&pair[0], &pair[1]);
        let gap = &source.text[left.end..right.start];

        // Line breaks are the business of other rules.
        if !gap.bytes().all(|byte| matches!(byte, b' ' | b'\t')) {
            continue;
        }

        if let Some(wanted) = wanted_gap(source.text, left, right, gap, &context) {
            if wanted != gap {
                edits.replace(left.end, right.start, wanted);
            }
        }
    }
}

/// What the AST knows that the tokens don't. Every set holds the start offsets of tokens.
struct Context<'s> {
    text: &'s str,
    tokens: &'s [Token],
    /// No space before: call and method parentheses, `object[key]`, `Foo<T>`, `i++`, `value!`, tagged templates.
    tight_before: HashSet<usize>,
    /// No space after: unary operators and the `<` of generics.
    tight_after: HashSet<usize>,
    /// A space before: binary operators, block braces, `function (`, `async (`.
    spaced_before: HashSet<usize>,
    /// A space after: binary operators and generator stars.
    spaced_after: HashSet<usize>,
    /// The `?` and `:` of conditional expressions and types, which are spaced like operators.
    ternary: HashSet<usize>,
    /// Contextual keywords used as keywords: `as`, `satisfies`, `of`, `from`.
    keywords: HashSet<usize>,
    /// Names following a `.`, which may look like keywords: `promise.catch`.
    property_names: HashSet<usize>,
    /// Braces of JSX expressions, `{value}` and `{...spread}`, which are tight, and colons of JSX names,
    /// `xlink:href`, which are left alone.
    jsx: HashSet<usize>,
}

impl<'s> Context<'s> {
    fn new(source: &'s Source) -> Self {
        let tokens = source.tokens.as_slice();
        let after_dot = tokens.windows(2).filter(|pair| matches!(pair[0].kind, Kind::Dot | Kind::QuestionDot)).map(|pair| pair[1].start);

        Self {
            text: source.text,
            tokens,
            tight_before: HashSet::new(),
            tight_after: HashSet::new(),
            spaced_before: HashSet::new(),
            spaced_after: HashSet::new(),
            ternary: HashSet::new(),
            keywords: HashSet::new(),
            property_names: after_dot.collect(),
            jsx: HashSet::new(),
        }
    }

    /// Index of the first token starting at or after `offset`.
    fn index_at(&self, offset: u32) -> usize {
        self.tokens.partition_point(|token| token.start < offset as usize)
    }

    fn token_at(&self, offset: u32) -> Option<Token> {
        self.tokens.get(self.index_at(offset)).copied()
    }

    /// The last token starting before `offset`.
    fn token_before(&self, offset: u32) -> Option<Token> {
        self.index_at(offset).checked_sub(1).map(|index| self.tokens[index])
    }

    /// An operator sitting right before its right-hand side: spaced on both sides.
    fn operator_before(&mut self, right: u32) {
        if let Some(operator) = self.token_before(right) {
            self.spaced_before.insert(operator.start);
            self.spaced_after.insert(operator.start);
        }
    }

    fn ternary_before(&mut self, right: u32) {
        if let Some(operator) = self.token_before(right) {
            self.ternary.insert(operator.start);
        }
    }

    fn keyword_before(&mut self, right: u32) {
        if let Some(keyword) = self.token_before(right) {
            self.keywords.insert(keyword.start);
        }
    }

    /// The `type` in `import type {` and `export type {`.
    fn type_keyword(&mut self, declaration: u32) {
        if let Some(keyword) = self.tokens.get(self.index_at(declaration) + 1).filter(|token| token.kind == Kind::Type) {
            self.keywords.insert(keyword.start);
        }
    }

    /// The `[` or `(` that follows `after`, skipping `?.`.
    fn tight_bracket(&mut self, after: u32, kind: Kind) {
        let bracket = self.tokens[self.index_at(after)..].iter().find(|token| token.kind != Kind::QuestionDot);
        if let Some(bracket) = bracket.filter(|token| token.kind == kind) {
            self.tight_before.insert(bracket.start);
        }
    }

    /// `<T>`: nothing inside the angle brackets, and nothing before them when they follow a name.
    fn angle_brackets(&mut self, span: Span, after_name: bool) {
        self.tight_after.insert(span.start as usize);
        self.tight_before.insert(span.end as usize - 1);
        if after_name {
            self.tight_before.insert(span.start as usize);
        }
    }

    /// The parenthesis opening the parameters of a function or method: `function () {}`, but `name() {}`.
    fn function_paren(&mut self, type_parameters: Option<&TSTypeParameterDeclaration>, params: &FormalParameters) {
        let name_end = type_parameters.map_or(params.span.start, |parameters| parameters.span.start);
        let index = self.index_at(name_end);
        let anonymous = match index.checked_sub(1).map(|index| self.tokens[index].kind) {
            Some(Kind::Function) => true,
            Some(Kind::Star) => index >= 2 && self.tokens[index - 2].kind == Kind::Function,
            _ => false,
        };

        if anonymous {
            self.spaced_before.insert(params.span.start as usize);
        }
        else {
            self.tight_before.insert(params.span.start as usize);
        }

        if let Some(parameters) = type_parameters {
            self.angle_brackets(parameters.span, !anonymous);
        }
    }

    /// `function* name`, `async* name` and `yield* value`: the star hugs what is before it.
    /// With nothing before it, it hugs the name instead: `*name() {}`.
    fn star(&mut self, from: u32, to: u32) {
        let range = self.index_at(from)..self.index_at(to);
        if let Some(star) = self.tokens[range].iter().find(|token| token.kind == Kind::Star) {
            if star.start > from as usize {
                self.tight_before.insert(star.start);
                self.spaced_after.insert(star.start);
            }
            else {
                self.tight_after.insert(star.start);
            }
        }
    }

    /// The `{` of a block: `if (a) {`, `class A {`.
    fn block(&mut self, offset: u32) {
        if self.text.as_bytes().get(offset as usize) == Some(&b'{') {
            self.spaced_before.insert(offset as usize);
        }
    }
}

impl<'a> Visit<'a> for Context<'_> {
    // Operators

    fn visit_binary_expression(&mut self, it: &BinaryExpression<'a>) {
        self.operator_before(it.right.span().start);
        walk::walk_binary_expression(self, it);
    }

    fn visit_logical_expression(&mut self, it: &LogicalExpression<'a>) {
        self.operator_before(it.right.span().start);
        walk::walk_logical_expression(self, it);
    }

    fn visit_assignment_expression(&mut self, it: &AssignmentExpression<'a>) {
        self.operator_before(it.right.span().start);
        walk::walk_assignment_expression(self, it);
    }

    fn visit_conditional_expression(&mut self, it: &ConditionalExpression<'a>) {
        self.ternary_before(it.consequent.span().start);
        self.ternary_before(it.alternate.span().start);
        walk::walk_conditional_expression(self, it);
    }

    fn visit_variable_declarator(&mut self, it: &VariableDeclarator<'a>) {
        if let Some(init) = &it.init {
            self.operator_before(init.span().start);
        }
        walk::walk_variable_declarator(self, it);
    }

    fn visit_assignment_pattern(&mut self, it: &AssignmentPattern<'a>) {
        self.operator_before(it.right.span().start);
        walk::walk_assignment_pattern(self, it);
    }

    fn visit_assignment_target_with_default(&mut self, it: &AssignmentTargetWithDefault<'a>) {
        self.operator_before(it.init.span().start);
        walk::walk_assignment_target_with_default(self, it);
    }

    fn visit_formal_parameter(&mut self, it: &FormalParameter<'a>) {
        if let Some(initializer) = &it.initializer {
            self.operator_before(initializer.span().start);
        }
        walk::walk_formal_parameter(self, it);
    }

    fn visit_property_definition(&mut self, it: &PropertyDefinition<'a>) {
        if let Some(value) = &it.value {
            self.operator_before(value.span().start);
        }
        walk::walk_property_definition(self, it);
    }

    fn visit_accessor_property(&mut self, it: &AccessorProperty<'a>) {
        if let Some(value) = &it.value {
            self.operator_before(value.span().start);
        }
        walk::walk_accessor_property(self, it);
    }

    fn visit_ts_type_alias_declaration(&mut self, it: &TSTypeAliasDeclaration<'a>) {
        // The `=`, which a leading `|` or `&` may separate from the type.
        let index = self.index_at(it.type_annotation.span().start);
        let equals = self.tokens[..index].iter().rev().take(2).find(|token| token.kind == Kind::Eq).copied();
        if let Some(equals) = equals {
            self.spaced_before.insert(equals.start);
            self.spaced_after.insert(equals.start);
        }
        if let Some(parameters) = &it.type_parameters {
            self.angle_brackets(parameters.span, true);
        }
        walk::walk_ts_type_alias_declaration(self, it);
    }

    fn visit_ts_enum_member(&mut self, it: &TSEnumMember<'a>) {
        if let Some(initializer) = &it.initializer {
            self.operator_before(initializer.span().start);
        }
        walk::walk_ts_enum_member(self, it);
    }

    fn visit_ts_type_parameter(&mut self, it: &TSTypeParameter<'a>) {
        if let Some(default) = &it.default {
            self.operator_before(default.span().start);
        }
        walk::walk_ts_type_parameter(self, it);
    }

    fn visit_ts_union_type(&mut self, it: &TSUnionType<'a>) {
        for member in &it.types {
            if self.token_before(member.span().start).is_some_and(|token| token.kind == Kind::Pipe) {
                self.operator_before(member.span().start);
            }
        }
        walk::walk_ts_union_type(self, it);
    }

    fn visit_ts_intersection_type(&mut self, it: &TSIntersectionType<'a>) {
        for member in &it.types {
            if self.token_before(member.span().start).is_some_and(|token| token.kind == Kind::Amp) {
                self.operator_before(member.span().start);
            }
        }
        walk::walk_ts_intersection_type(self, it);
    }

    fn visit_ts_conditional_type(&mut self, it: &TSConditionalType<'a>) {
        self.ternary_before(it.true_type.span().start);
        self.ternary_before(it.false_type.span().start);
        walk::walk_ts_conditional_type(self, it);
    }

    fn visit_unary_expression(&mut self, it: &UnaryExpression<'a>) {
        if !it.operator.is_keyword() {
            self.tight_after.insert(it.span.start as usize);
        }
        walk::walk_unary_expression(self, it);
    }

    fn visit_update_expression(&mut self, it: &UpdateExpression<'a>) {
        if it.prefix {
            self.tight_after.insert(it.span.start as usize);
        }
        else {
            self.tight_before.insert(it.span.end as usize - 2);
        }
        walk::walk_update_expression(self, it);
    }

    fn visit_ts_non_null_expression(&mut self, it: &TSNonNullExpression<'a>) {
        self.tight_before.insert(it.span.end as usize - 1);
        walk::walk_ts_non_null_expression(self, it);
    }

    // Keywords

    fn visit_ts_as_expression(&mut self, it: &TSAsExpression<'a>) {
        self.keyword_before(it.type_annotation.span().start);
        walk::walk_ts_as_expression(self, it);
    }

    fn visit_ts_satisfies_expression(&mut self, it: &TSSatisfiesExpression<'a>) {
        self.keyword_before(it.type_annotation.span().start);
        walk::walk_ts_satisfies_expression(self, it);
    }

    fn visit_for_of_statement(&mut self, it: &ForOfStatement<'a>) {
        self.keyword_before(it.right.span().start);
        walk::walk_for_of_statement(self, it);
    }

    fn visit_import_declaration(&mut self, it: &ImportDeclaration<'a>) {
        self.keyword_before(it.source.span.start);
        self.type_keyword(it.span.start);
        walk::walk_import_declaration(self, it);
    }

    fn visit_import_namespace_specifier(&mut self, it: &ImportNamespaceSpecifier<'a>) {
        self.spaced_before.insert(it.span.start as usize);
        self.spaced_after.insert(it.span.start as usize);
        walk::walk_import_namespace_specifier(self, it);
    }

    fn visit_export_named_declaration(&mut self, it: &ExportNamedDeclaration<'a>) {
        self.type_keyword(it.span.start);
        walk::walk_export_named_declaration(self, it);
    }

    fn visit_export_from_declaration(&mut self, it: &ExportFromDeclaration<'a>) {
        self.keyword_before(it.source.span.start);
        self.type_keyword(it.span.start);
        walk::walk_export_from_declaration(self, it);
    }

    fn visit_export_all_declaration(&mut self, it: &ExportAllDeclaration<'a>) {
        self.keyword_before(it.source.span.start);
        // `export * from`
        let range = self.index_at(it.span.start)..self.index_at(it.source.span.start);
        if let Some(star) = self.tokens[range].iter().find(|token| token.kind == Kind::Star) {
            self.spaced_before.insert(star.start);
            self.spaced_after.insert(star.start);
        }
        walk::walk_export_all_declaration(self, it);
    }

    // Functions and calls

    fn visit_function(&mut self, it: &Function<'a>, flags: ScopeFlags) {
        self.function_paren(it.type_parameters.as_deref(), &it.params);
        if it.generator {
            self.star(it.span.start, it.params.span.start);
        }
        walk::walk_function(self, it, flags);
    }

    fn visit_method_definition(&mut self, it: &MethodDefinition<'a>) {
        if it.value.generator {
            self.star(it.span.start, it.key.span().start);
        }
        walk::walk_method_definition(self, it);
    }

    fn visit_object_property(&mut self, it: &ObjectProperty<'a>) {
        if matches!(&it.value, Expression::FunctionExpression(function) if it.method && function.generator) {
            self.star(it.span.start, it.key.span().start);
        }
        walk::walk_object_property(self, it);
    }

    fn visit_arrow_function_expression(&mut self, it: &ArrowFunctionExpression<'a>) {
        // `async () => {}`
        if it.r#async && self.token_before(it.params.span.start).is_some_and(|token| token.kind == Kind::Async) {
            self.spaced_before.insert(it.params.span.start as usize);
        }
        if let Some(parameters) = &it.type_parameters {
            self.angle_brackets(parameters.span, false);
        }
        walk::walk_arrow_function_expression(self, it);
    }

    fn visit_ts_method_signature(&mut self, it: &TSMethodSignature<'a>) {
        self.function_paren(it.type_parameters.as_deref(), &it.params);
        walk::walk_ts_method_signature(self, it);
    }

    fn visit_yield_expression(&mut self, it: &YieldExpression<'a>) {
        if it.delegate {
            self.star(it.span.start, it.argument.as_ref().map_or(it.span.end, |argument| argument.span().start));
        }
        walk::walk_yield_expression(self, it);
    }

    fn visit_call_expression(&mut self, it: &CallExpression<'a>) {
        self.tight_bracket(it.type_arguments.as_ref().map_or(it.callee.span().end, |arguments| arguments.span.end), Kind::LParen);
        walk::walk_call_expression(self, it);
    }

    fn visit_new_expression(&mut self, it: &NewExpression<'a>) {
        self.tight_bracket(it.type_arguments.as_ref().map_or(it.callee.span().end, |arguments| arguments.span.end), Kind::LParen);
        walk::walk_new_expression(self, it);
    }

    fn visit_import_expression(&mut self, it: &ImportExpression<'a>) {
        let paren = self.tokens[self.index_at(it.span.start)..].iter().find(|token| token.kind == Kind::LParen);
        if let Some(paren) = paren.filter(|paren| paren.start < it.source.span().start as usize) {
            self.tight_before.insert(paren.start);
        }
        walk::walk_import_expression(self, it);
    }

    fn visit_tagged_template_expression(&mut self, it: &TaggedTemplateExpression<'a>) {
        self.tight_before.insert(it.quasi.span.start as usize);
        walk::walk_tagged_template_expression(self, it);
    }

    // Members and generics

    fn visit_computed_member_expression(&mut self, it: &ComputedMemberExpression<'a>) {
        self.tight_bracket(it.object.span().end, Kind::LBrack);
        walk::walk_computed_member_expression(self, it);
    }

    fn visit_ts_indexed_access_type(&mut self, it: &TSIndexedAccessType<'a>) {
        self.tight_bracket(it.object_type.span().end, Kind::LBrack);
        walk::walk_ts_indexed_access_type(self, it);
    }

    fn visit_ts_array_type(&mut self, it: &TSArrayType<'a>) {
        self.tight_bracket(it.element_type.span().end, Kind::LBrack);
        walk::walk_ts_array_type(self, it);
    }

    fn visit_ts_type_parameter_instantiation(&mut self, it: &TSTypeParameterInstantiation<'a>) {
        self.angle_brackets(it.span, true);
        walk::walk_ts_type_parameter_instantiation(self, it);
    }

    fn visit_class(&mut self, it: &Class<'a>) {
        if let Some(parameters) = &it.type_parameters {
            self.angle_brackets(parameters.span, it.id.is_some());
        }
        walk::walk_class(self, it);
    }

    fn visit_ts_interface_declaration(&mut self, it: &TSInterfaceDeclaration<'a>) {
        if let Some(parameters) = &it.type_parameters {
            self.angle_brackets(parameters.span, true);
        }
        walk::walk_ts_interface_declaration(self, it);
    }

    // Blocks

    fn visit_block_statement(&mut self, it: &BlockStatement<'a>) {
        self.block(it.span.start);
        walk::walk_block_statement(self, it);
    }

    fn visit_function_body(&mut self, it: &FunctionBody<'a>) {
        self.block(it.span.start);
        walk::walk_function_body(self, it);
    }

    fn visit_class_body(&mut self, it: &ClassBody<'a>) {
        self.block(it.span.start);
        walk::walk_class_body(self, it);
    }

    fn visit_static_block(&mut self, it: &StaticBlock<'a>) {
        if let Some(brace) = self.tokens.get(self.index_at(it.span.start) + 1) {
            self.block(brace.start as u32);
        }
        walk::walk_static_block(self, it);
    }

    fn visit_switch_statement(&mut self, it: &SwitchStatement<'a>) {
        let brace = self.tokens[self.index_at(it.discriminant.span().end)..].iter().find(|token| token.kind == Kind::LCurly);
        if let Some(brace) = brace {
            self.block(brace.start as u32);
        }
        walk::walk_switch_statement(self, it);
    }

    fn visit_ts_interface_body(&mut self, it: &TSInterfaceBody<'a>) {
        self.block(it.span.start);
        walk::walk_ts_interface_body(self, it);
    }

    fn visit_ts_enum_body(&mut self, it: &TSEnumBody<'a>) {
        self.block(it.span.start);
        walk::walk_ts_enum_body(self, it);
    }

    fn visit_ts_module_block(&mut self, it: &TSModuleBlock<'a>) {
        self.block(it.span.start);
        walk::walk_ts_module_block(self, it);
    }

    // JSX

    fn visit_jsx_expression_container(&mut self, it: &JSXExpressionContainer<'a>) {
        self.jsx.insert(it.span.start as usize);
        self.jsx.insert(it.span.end as usize - 1);
        walk::walk_jsx_expression_container(self, it);
    }

    fn visit_jsx_spread_attribute(&mut self, it: &JSXSpreadAttribute<'a>) {
        self.jsx.insert(it.span.start as usize);
        self.jsx.insert(it.span.end as usize - 1);
        walk::walk_jsx_spread_attribute(self, it);
    }

    fn visit_jsx_spread_child(&mut self, it: &JSXSpreadChild<'a>) {
        self.jsx.insert(it.span.start as usize);
        self.jsx.insert(it.span.end as usize - 1);
        walk::walk_jsx_spread_child(self, it);
    }

    // `<Foo a={b} />` and `</Foo>`: nothing inside the angle brackets but one space before `/>`.
    fn visit_jsx_opening_element(&mut self, it: &JSXOpeningElement<'a>) {
        self.tight_after.insert(it.span.start as usize);
        let end = it.span.end as usize - 1;
        match self.token_before(end as u32).filter(|token| token.kind == Kind::Slash) {
            Some(slash) => {
                self.spaced_before.insert(slash.start);
                self.tight_after.insert(slash.start);
            }
            None => {
                self.tight_before.insert(end);
            }
        }
        walk::walk_jsx_opening_element(self, it);
    }

    fn visit_jsx_closing_element(&mut self, it: &JSXClosingElement<'a>) {
        self.tight_after.insert(it.span.start as usize);
        if let Some(slash) = self.token_at(it.span.start + 1) {
            self.tight_after.insert(slash.start);
        }
        self.tight_before.insert(it.span.end as usize - 1);
        walk::walk_jsx_closing_element(self, it);
    }

    fn visit_jsx_opening_fragment(&mut self, it: &JSXOpeningFragment) {
        self.tight_after.insert(it.span.start as usize);
        walk::walk_jsx_opening_fragment(self, it);
    }

    fn visit_jsx_closing_fragment(&mut self, it: &JSXClosingFragment) {
        self.tight_after.insert(it.span.start as usize);
        self.tight_before.insert(it.span.end as usize - 1);
        walk::walk_jsx_closing_fragment(self, it);
    }

    fn visit_jsx_attribute(&mut self, it: &JSXAttribute<'a>) {
        if let Some(equals) = self.token_at(it.name.span().end).filter(|token| it.value.is_some() && token.kind == Kind::Eq) {
            self.tight_before.insert(equals.start);
            self.tight_after.insert(equals.start);
        }
        walk::walk_jsx_attribute(self, it);
    }

    fn visit_jsx_namespaced_name(&mut self, it: &JSXNamespacedName<'a>) {
        if let Some(colon) = self.token_at(it.namespace.span.end).filter(|token| token.kind == Kind::Colon) {
            self.jsx.insert(colon.start);
        }
        walk::walk_jsx_namespaced_name(self, it);
    }
}

/// Keywords that take a space on either side, whatever they sit next to.
fn is_keyword(kind: Kind) -> bool {
    use Kind::*;
    matches!(
        kind,
        Await | Break | Case | Catch | Class | Const | Continue | Default | Delete | Do | Else | Export | Extends | Finally | For | Function | If | Import | In | Instanceof | Let | New | Return | Switch | Throw | Try | Typeof | Var | Void | While | With | Yield
    )
}

fn is_literal(kind: Kind) -> bool {
    kind.is_number() || matches!(kind, Kind::Str | Kind::RegExp | Kind::NoSubstitutionTemplate)
}

/// The whitespace that belongs between two items on the same line, or `None` to leave it as written.
fn wanted_gap(text: &str, left: &Item, right: &Item, gap: &str, context: &Context) -> Option<&'static str> {
    use Kind::*;

    const TIGHT: Option<&str> = Some("");
    const SPACED: Option<&str> = Some(" ");

    let (l, r) = (left.kind, right.kind);

    if context.tight_before.contains(&right.start) || context.tight_after.contains(&left.start) {
        return TIGHT;
    }
    if context.spaced_before.contains(&right.start) {
        return SPACED;
    }

    // `(a)` and `[a]`, never `( a )` or `[ a ]`.
    if l == Some(LParen) || r == Some(RParen) || l == Some(LBrack) || r == Some(RBrack) {
        return TIGHT;
    }

    // `{ a }`, never `{a}`, and an empty pair is `{}`. In JSX it is `{value}`.
    if l == Some(LCurly) || r == Some(RCurly) {
        let empty = l == Some(LCurly) && r == Some(RCurly);
        let jsx = (l == Some(LCurly) && context.jsx.contains(&left.start)) || (r == Some(RCurly) && context.jsx.contains(&right.start));
        return if jsx || empty { TIGHT } else { SPACED };
    }

    // `${value}`, never `${ value }`.
    if matches!(l, Some(TemplateHead | TemplateMiddle)) || matches!(r, Some(TemplateMiddle | TemplateTail)) {
        return TIGHT;
    }

    // `...rest`, never `... rest`.
    if l == Some(Dot3) {
        return TIGHT;
    }

    // `a.b`, never `a .b` or `a. b`. A number needs the space: `5 .toFixed()`.
    if matches!(r, Some(Dot | QuestionDot)) {
        return if l.is_some_and(Kind::is_number) { None } else { TIGHT };
    }
    if matches!(l, Some(Dot | QuestionDot)) {
        return TIGHT;
    }

    // `a, b`, never `a ,b`. Holes in arrays, `[a, , b]`, and `<T,>` are left alone.
    if r == Some(Comma) {
        return if l == Some(Comma) { None } else { TIGHT };
    }
    if l == Some(Comma) && !matches!(r, Some(Comma | RAngle)) {
        return SPACED;
    }

    // `for (a; b; c)`, never `for (a ;b ;c)`.
    if r == Some(Semicolon) && l != Some(Semicolon) {
        return TIGHT;
    }
    if l == Some(Semicolon) && r != Some(Semicolon) {
        // A semicolon starting a line guards the statement after it, `;(async () => {})()`.
        let leading = text[..left.start].rsplit('\n').next().is_some_and(|before| before.trim().is_empty());
        return if leading { None } else { SPACED };
    }

    // `a ? b : c`, but `key: value`, `name?: Type` and `case 1:`.
    if r == Some(Colon) || r == Some(Question) {
        return if context.ternary.contains(&right.start) { SPACED } else if context.jsx.contains(&right.start) { None } else { TIGHT };
    }
    if l == Some(Colon) {
        return if context.jsx.contains(&left.start) { None } else { SPACED };
    }
    if l == Some(Question) && context.ternary.contains(&left.start) {
        return SPACED;
    }

    // `a + b`, `a = b`, `a => b`, `function* name`.
    if context.spaced_after.contains(&left.start) || l == Some(Arrow) || r == Some(Arrow) {
        return SPACED;
    }

    // `if (`, `} else {`, `return [`, `x as [A]`, but not `promise.catch(`.
    if let Some(keyword) = l.filter(|_| !context.property_names.contains(&left.start)) {
        let follows = r.is_some_and(|kind| is_literal(kind) || matches!(kind, LParen | LBrack | LCurly | LAngle | Tilde | Bang | Plus | Plus2 | Minus | Minus2 | TemplateHead));
        if follows && (is_keyword(keyword) || context.keywords.contains(&left.start)) && keyword != Function {
            return SPACED;
        }
    }
    if let Some(keyword) = r.filter(|_| !context.property_names.contains(&right.start)) {
        let precedes = l.is_some_and(|kind| is_literal(kind) || matches!(kind, RParen | RBrack | RCurly | TemplateTail));
        if precedes && (is_keyword(keyword) || matches!(keyword, As | Satisfies | Of | From | This | Super)) {
            return SPACED;
        }
    }

    // Anything else keeps its single space, or its lack of one.
    if gap.len() > 1 || gap.contains('\t') { SPACED } else { None }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use crate::Configuration;
    use crate::format_text;

    fn format(text: &str) -> String {
        format_text(Path::new("test.tsx"), text, &Configuration::default()).unwrap().unwrap_or_else(|| text.to_string())
    }

    #[test]
    fn parens_and_brackets() {
        assert_eq!(format("foo( a, b )\n"), "foo(a, b)\n");
        assert_eq!(format("const a = [ 1, 2 ]\n"), "const a = [1, 2]\n");
        assert_eq!(format("const a = [ { b: 1 } ]\n"), "const a = [{ b: 1 }]\n");
        assert_eq!(format("a[ b ] = c [d]\n"), "a[b] = c[d]\n");
        assert_eq!(format("const a = b?. [c]\n"), "const a = b?.[c]\n");
        assert_eq!(format("for (const a of [b]) {}\n"), "for (const a of [b]) {}\n");
        assert_eq!(format("foo( )\n"), "foo()\n");
        assert_eq!(format("type A = B ['c'] | D [] | (E) [] | [ F, G ]\n"), "type A = B[\"c\"] | D[] | (E)[] | [F, G]\n");
    }

    #[test]
    fn braces() {
        assert_eq!(format("const {a} = {b: 1}\n"), "const { a } = { b: 1 }\n");
        assert_eq!(format("import {a} from \"a\"\nexport {a}\n"), "import { a } from \"a\"\nexport { a }\n");
        assert_eq!(format("type A = {a: string}\n"), "type A = { a: string }\n");
        assert_eq!(format("try {a()} catch {b()}\n"), "try { a() }\ncatch { b() }\n");
        assert_eq!(format("const a = {}\nfunction f() {}\nconst b = { }\n"), "const a = {}\nfunction f() {}\nconst b = {}\n");
        assert_eq!(format("const a = ({b}) => ({c: b})\n"), "const a = ({ b }) => ({ c: b })\n");
    }

    #[test]
    fn jsx() {
        assert_eq!(format("const a = <div b={c} {...d}>{e}</div>\n"), "const a = <div b={c} {...d}>{e}</div>\n");
        assert_eq!(format("const a = <div b={{c: 1}} />\n"), "const a = <div b={{ c: 1 }} />\n");
        assert_eq!(format("const a = <a xlink:href=\"b\" />\n"), "const a = <a xlink:href=\"b\" />\n");
        assert_eq!(format("const a = <B  c = {d}  e = \"f\"/>\n"), "const a = <B c={d} e=\"f\" />\n");
        assert_eq!(format("const a = < B c ></ B >\nconst d = < ></ >\nconst e = <F<G> / >\n"), "const a = <B c></B>\nconst d = <></>\nconst e = <F<G> />\n");
        assert_eq!(format("const a = <B.C d  />\nconst e = <F  />\n"), "const a = <B.C d />\nconst e = <F />\n");
        assert_eq!(format("const a = <div b={  c  } { ...d }>{ e }{ /* f */ }</div>\n"), "const a = <div b={c} {...d}>{e}{/* f */}</div>\n");
    }

    #[test]
    fn templates_and_spread() {
        assert_eq!(format("const a = `${ b } and ${ c }`\n"), "const a = `${b} and ${c}`\n");
        assert_eq!(format("const a = [... b]\n"), "const a = [...b]\n");
        assert_eq!(format("const a = tag `b`\n"), "const a = tag`b`\n");
    }

    #[test]
    fn properties() {
        assert_eq!(format("a .b. c ?.d\n"), "a.b.c?.d\n");
        assert_eq!(format("const a = 5 .toFixed()\n"), "const a = 5 .toFixed()\n");
        assert_eq!(format("a\n    .b()\n    .c()\n"), "a\n    .b()\n    .c()\n");
    }

    #[test]
    fn commas_and_semicolons() {
        assert_eq!(format("foo(a ,b,c)\n"), "foo(a, b, c)\n");
        assert_eq!(format("const a = [1, , 2]\n"), "const a = [1, , 2]\n");
        assert_eq!(format("const a = <T,>(b: T) => b\n"), "const a = <T,>(b: T) => b\n");
        assert_eq!(format("for (let i = 0 ;i < 1;i++) {}\n"), "for (let i = 0; i < 1; i++) {}\n");
        assert_eq!(format("a()\n;(b)()\n;[c].map(d)\n"), "a()\n;(b)()\n;[c].map(d)\n");
    }

    #[test]
    fn multiple_spaces() {
        assert_eq!(format("const  a  =  1  // note\n"), "const a = 1 // note\n");
        assert_eq!(format("const a = `x  y`\nconst b = \"x  y\"\n"), "const a = `x  y`\nconst b = \"x  y\"\n");
    }

    #[test]
    fn colons() {
        assert_eq!(format("const a = { b :1, c:    2 }\n"), "const a = { b: 1, c: 2 }\n");
        assert_eq!(format("function f(a :number, b ?:string) :void {}\n"), "function f(a: number, b?: string): void {}\n");
        assert_eq!(format("switch (a) {\n    case 1 :break\n    default :\n}\n"), "switch (a) {\n    case 1: break\n    default:\n}\n");
        assert_eq!(format("const a = b?c:d\n"), "const a = b ? c : d\n");
        assert_eq!(format("type A<T> = T extends string?[name :string, age ?:number]:never\n"), "type A<T> = T extends string ? [name: string, age?: number] : never\n");
        assert_eq!(format("interface A { [key :string] :number }\n"), "interface A { [key: string]: number }\n");
    }

    #[test]
    fn operators() {
        assert_eq!(format("const a=b+c*d\n"), "const a = b + c * d\n");
        assert_eq!(format("a=b\na+=1\na??=c\n"), "a = b\na += 1\na ??= c\n");
        assert_eq!(format("const a = b&&c||d\nconst e = f??g\n"), "const a = b && c || d\nconst e = f ?? g\n");
        assert_eq!(format("function f(a=1, { b=2 }={}) {}\n"), "function f(a = 1, { b = 2 } = {}) {}\n");
        assert_eq!(format("type A<T=string>=B|C&D\n"), "type A<T = string> = B | C & D\n");
        assert_eq!(format("class A { a=1 }\nenum B { C=1 }\n"), "class A { a = 1 }\nenum B { C = 1 }\n");
        assert_eq!(format("const a = b<c\nconst d = e>f\n"), "const a = b < c\nconst d = e > f\n");
        assert_eq!(format("type A =\n    | B\n    | C\n"), "type A =\n    | B\n    | C\n");
    }

    #[test]
    fn unary_operators() {
        assert_eq!(format("const a = ! b\nconst c = - d\ni ++\n++ i\n"), "const a = !b\nconst c = -d\ni++\n++i\n");
        assert_eq!(format("const a = b - -c\nconst d = !!e\nconst f = g !\n"), "const a = b - -c\nconst d = !!e\nconst f = g!\n");
        assert_eq!(format("const a = typeof b\nconst c = typeof(d)\nvoid(0)\n"), "const a = typeof b\nconst c = typeof (d)\nvoid (0)\n");
    }

    #[test]
    fn arrows() {
        assert_eq!(format("let a = (b)=>c\nlet d = e=>{}\n"), "let a = (b) => c\nlet d = (e) => {}\n");
        assert_eq!(format("type A = (b: string)=>void\n"), "type A = (b: string) => void\n");
    }

    #[test]
    fn keywords() {
        assert_eq!(format("if(a) {}\nelse if(b) {}\nfor(const c of[d]) {}\nwhile(e) {}\n"), "if (a) {}\nelse if (b) {}\nfor (const c of [d]) {}\nwhile (e) {}\n");
        assert_eq!(format("try{}\ncatch{}\nfinally{}\n"), "try {}\ncatch {}\nfinally {}\n");
        assert_eq!(format("function f() { return[a] }\n"), "function f() {\n    return [a]\n}\n");
        assert_eq!(format("const[a] = b\nconst{c} = d\n"), "const [a] = b\nconst { c } = d\n");
        assert_eq!(format("import{a}from\"a\"\nexport{a}\n"), "import { a } from \"a\"\nexport { a }\n");
        assert_eq!(format("import type{a}from\"a\"\nexport type{a}\nexport*from\"b\"\nimport*as c from\"c\"\n"), "import type { a } from \"a\"\nexport type { a }\nexport * from \"b\"\nimport * as c from \"c\"\n");
        assert_eq!(format("const a = (b)as[C]\nconst d = {}satisfies{}\n"), "const a = (b) as [C]\nconst d = {} satisfies {}\n");
        assert_eq!(format("if (a) {}else{}\n"), "if (a) {}\nelse {}\n");
        assert_eq!(format("a.catch(b).finally(c)\na.delete(d)\nconst e = await import(\"f\")\n"), "a.catch(b).finally(c)\na.delete(d)\nconst e = await import(\"f\")\n");
        assert_eq!(format("class A { static of() {} delete() {} }\n"), "class A { static of() {} delete() {} }\n");
    }

    #[test]
    fn blocks() {
        assert_eq!(format("if (a){}\nfunction f(){}\nclass A{}\n"), "if (a) {}\nfunction f() {}\nclass A {}\n");
        assert_eq!(format("interface A{}\nenum B{}\nnamespace C{}\nswitch (a){}\n"), "interface A {}\nenum B {}\nnamespace C {}\nswitch (a) {}\n");
        assert_eq!(format("let a = () =>{}\nclass B { static{} }\n"), "let a = () => {}\nclass B { static {} }\n");
    }

    #[test]
    fn functions_and_calls() {
        assert_eq!(format("function f () {}\nlet a = function() {}\nlet b = async() => {}\n"), "function f() {}\nlet a = function () {}\nlet b = async () => {}\n");
        assert_eq!(format("class A { constructor () {} get b () { return 1 } c <T> () {} }\n"), "class A { get b() {\n    return 1\n} constructor() {} c<T>() {} }\n");
        assert_eq!(format("interface A { b (): void, c ? (): void }\n"), "interface A { b(): void, c?(): void }\n");
        assert_eq!(format("foo (a)\nnew Foo (b)\nfoo <T> (c)\nfoo?. (d)\nsuper.e (f)\n"), "foo(a)\nnew Foo(b)\nfoo<T>(c)\nfoo?.(d)\nsuper.e(f)\n");
        assert_eq!(format("const a = (b) => c\nconst d = (e)\n"), "const a = (b) => c\nconst d = (e)\n");
    }

    #[test]
    fn generics() {
        assert_eq!(format("const a: Map < string, number > = new Map < string, number > ()\n"), "const a: Map<string, number> = new Map<string, number>()\n");
        assert_eq!(format("function f < T > (a: T) {}\nclass A < T > {}\ninterface B < T > {}\ntype C < T > = T\n"), "function f<T>(a: T) {}\nclass A<T> {}\ninterface B<T> {}\ntype C<T> = T\n");
        assert_eq!(format("const a = create< [Log]>()\nconst b: A< { c: 1 } > = d\n"), "const a = create<[Log]>()\nconst b: A<{ c: 1 }> = d\n");
        assert_eq!(format("const a = < T, >(b: T) => b\nconst c = async <T,>(d: T) => d\n"), "const a = <T,>(b: T) => b\nconst c = async <T,>(d: T) => d\n");
    }

    #[test]
    fn generators() {
        assert_eq!(format("function *a() {}\nconst b = function*() {}\n"), "function* a() {}\nconst b = function* () {}\n");
        assert_eq!(format("class A { async *b() {} *c() {} }\n"), "class A { async* b() {} *c() {} }\n");
        assert_eq!(format("const a = { * b() {}, async *c() {} }\n"), "const a = { *b() {}, async* c() {} }\n");
        assert_eq!(format("function* a() { yield *b }\n"), "function* a() {\n    yield* b\n}\n");
    }
}
