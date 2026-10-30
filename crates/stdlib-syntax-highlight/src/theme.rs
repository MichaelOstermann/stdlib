//! What a token is, by its TextMate scopes, given to Irosashi as a VS Code theme.

use irosashi::Theme;

/// The classes a token can have, the same and in the same order as `tokenClasses` in
/// `packages/stdlib-syntax-highlight/src/Syntax/internals/tokenClasses.ts`. A token's class is its index
/// here plus one, 0 is none.
pub const CLASSES: [&str; 23] = [
    "attribute",
    "bold",
    "comment",
    "constant",
    "deleted",
    "escape",
    "function",
    "heading",
    "inserted",
    "invalid",
    "italic",
    "keyword",
    "link",
    "number",
    "operator",
    "parameter",
    "property",
    "quote",
    "regexp",
    "string",
    "tag",
    "type",
    "variable",
];

/// TextMate scope selectors and the class they give. The most specific selector matching a token's
/// scopes wins, as in VS Code themes, so `keyword.operator` beats `keyword`, and `string variable`
/// is a variable inside a string.
const SELECTORS: &[(&str, Option<&str>)] = &[
    ("comment", Some("comment")),
    ("punctuation.definition.comment", Some("comment")),
    ("keyword", Some("keyword")),
    ("storage", Some("keyword")),
    ("keyword.operator.expression", Some("keyword")),
    ("keyword.operator.new", Some("keyword")),
    ("keyword.operator.word", Some("keyword")),
    ("punctuation.definition.template-expression", Some("keyword")),
    ("punctuation.section.embedded", Some("keyword")),
    ("keyword.operator", Some("operator")),
    ("string", Some("string")),
    ("punctuation.definition.string", Some("string")),
    ("markup.raw", Some("string")),
    ("constant.character.escape", Some("escape")),
    ("string.regexp", Some("regexp")),
    ("string.regexp keyword.operator", Some("regexp")),
    ("string.regexp keyword.other", Some("regexp")),
    ("string.regexp punctuation.definition.string", Some("regexp")),
    ("constant", Some("constant")),
    ("support.constant", Some("constant")),
    ("variable.language", Some("constant")),
    ("variable.other.enummember", Some("constant")),
    ("constant.numeric", Some("number")),
    ("keyword.other.unit", Some("number")),
    ("entity.name.function", Some("function")),
    ("support.function", Some("function")),
    ("entity.name.type", Some("type")),
    ("entity.name.class", Some("type")),
    ("entity.name.namespace", Some("type")),
    ("entity.other.inherited-class", Some("type")),
    ("support.type", Some("type")),
    ("support.class", Some("type")),
    ("variable", Some("variable")),
    ("entity.name.variable", Some("variable")),
    ("support.variable", Some("variable")),
    ("variable.parameter", Some("parameter")),
    ("variable.other.property", Some("property")),
    ("variable.other.object.property", Some("property")),
    ("support.variable.property", Some("property")),
    ("support.type.property-name", Some("property")),
    ("meta.object-literal.key", Some("property")),
    ("entity.name.tag.key", Some("property")),
    ("entity.name.tag.yaml", Some("property")),
    ("entity.name.tag", Some("tag")),
    ("entity.other.attribute-name", Some("attribute")),
    ("markup.heading", Some("heading")),
    ("entity.name.section", Some("heading")),
    // Markdown's grammar scopes the markers of bold and italic text, not the text between them
    ("markup.bold", Some("bold")),
    ("string.other.strong", Some("bold")),
    ("markup.italic", Some("italic")),
    ("string.other.emphasis", Some("italic")),
    ("markup.underline.link", Some("link")),
    ("string.other.begin.link", Some("link")),
    ("string.other.link", Some("link")),
    ("constant.other.reference.link", Some("link")),
    ("markup.quote", Some("quote")),
    ("markup.inserted", Some("inserted")),
    ("meta.diff.header.to-file", Some("inserted")),
    ("punctuation.definition.inserted", Some("inserted")),
    ("markup.deleted", Some("deleted")),
    ("meta.diff.header.from-file", Some("deleted")),
    ("punctuation.definition.deleted", Some("deleted")),
    ("invalid", Some("invalid")),
    // Code embedded in a string or another language is colored as that code, not as the string around it
    ("meta.embedded", None),
    ("meta.template.expression", None),
    ("source.embedded", None),
    ("string source", None),
];

/// The theme of `SELECTORS`, its colors `#` and the number of the class.
pub fn theme() -> Theme {
    let color = |class: Option<&str>| {
        let number = class.map_or(0, |class| CLASSES.iter().position(|c| *c == class).unwrap() + 1);
        format!("#{number:06}")
    };
    let token_colors: Vec<_> = SELECTORS
        .iter()
        .map(|(scope, class)| serde_json::json!({ "scope": scope, "settings": { "foreground": color(*class) } }))
        .collect();
    let json = serde_json::json!({
        "colors": { "editor.background": "#000000", "editor.foreground": "#000000" },
        "tokenColors": token_colors,
    });
    Theme::parse(json.to_string().as_bytes()).unwrap()
}
