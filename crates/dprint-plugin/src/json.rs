//! JSON files: formatted by dprint's JSON formatter, after the keys of `package.json` and `tsconfig.json`
//! are put into their conventional order.

use std::path::Path;

use anyhow::Result;
use anyhow::anyhow;
use anyhow::bail;
use dprint_plugin_json::configuration::ConfigurationBuilder;
use dprint_plugin_json::configuration::TrailingCommaKind;
use jsonc_parser::CollectOptions;
use jsonc_parser::CommentCollectionStrategy;
use jsonc_parser::ParseOptions;
use jsonc_parser::ast::Object;
use jsonc_parser::ast::Value;
use jsonc_parser::common::Ranged;
use jsonc_parser::parse_to_ast;
use jsonc_parser::parse_to_serde_value;

/// How the keys of one object are ordered.
enum Order {
    /// The listed keys in this order. The others stay where they were written.
    Listed(&'static [&'static str]),
    Ascending,
}

const PACKAGE_JSON: &[&str] = &[
    "publisher", "name", "displayName", "type", "version", "private", "packageManager", "description", "author", "contributors", "license", "funding", "homepage", "repository",
    "bugs", "keywords", "categories", "sideEffects", "imports", "exports", "main", "module", "unpkg", "jsdelivr", "types", "typesVersions", "bin", "icon", "files", "engines",
    "activationEvents", "contributes", "scripts", "peerDependencies", "peerDependenciesMeta", "dependencies", "optionalDependencies", "devDependencies", "pnpm", "overrides",
    "resolutions", "husky", "simple-git-hooks", "lint-staged", "eslintConfig",
];

const EXPORTS: &[&str] = &["types", "import", "require", "default"];

const GIT_HOOKS: &[&str] = &["pre-commit", "prepare-commit-msg", "commit-msg", "post-commit", "pre-rebase", "post-rewrite", "post-checkout", "post-merge", "pre-push", "pre-auto-gc"];

const TSCONFIG: &[&str] = &["extends", "compilerOptions", "references", "files", "include", "exclude"];

const COMPILER_OPTIONS: &[&str] = &[
    // Projects
    "incremental", "composite", "tsBuildInfoFile", "disableSourceOfProjectReferenceRedirect", "disableSolutionSearching", "disableReferencedProjectLoad",
    // Language and environment
    "target", "jsx", "jsxFactory", "jsxFragmentFactory", "jsxImportSource", "lib", "moduleDetection", "noLib", "reactNamespace", "useDefineForClassFields",
    "emitDecoratorMetadata", "experimentalDecorators", "libReplacement",
    // Modules
    "baseUrl", "rootDir", "rootDirs", "customConditions", "module", "moduleResolution", "moduleSuffixes", "noResolve", "paths", "resolveJsonModule",
    "resolvePackageJsonExports", "resolvePackageJsonImports", "typeRoots", "types", "allowArbitraryExtensions", "allowImportingTsExtensions", "allowUmdGlobalAccess",
    // JavaScript support
    "allowJs", "checkJs", "maxNodeModuleJsDepth",
    // Type checking
    "strict", "strictBindCallApply", "strictFunctionTypes", "strictNullChecks", "strictPropertyInitialization", "allowUnreachableCode", "allowUnusedLabels", "alwaysStrict",
    "exactOptionalPropertyTypes", "noFallthroughCasesInSwitch", "noImplicitAny", "noImplicitOverride", "noImplicitReturns", "noImplicitThis",
    "noPropertyAccessFromIndexSignature", "noUncheckedIndexedAccess", "noUnusedLocals", "noUnusedParameters", "useUnknownInCatchVariables",
    // Emit
    "declaration", "declarationDir", "declarationMap", "downlevelIteration", "emitBOM", "emitDeclarationOnly", "importHelpers", "importsNotUsedAsValues", "inlineSourceMap",
    "inlineSources", "mapRoot", "newLine", "noEmit", "noEmitHelpers", "noEmitOnError", "outDir", "outFile", "preserveConstEnums", "preserveValueImports", "removeComments",
    "sourceMap", "sourceRoot", "stripInternal",
    // Interop constraints
    "allowSyntheticDefaultImports", "esModuleInterop", "forceConsistentCasingInFileNames", "isolatedDeclarations", "isolatedModules", "preserveSymlinks",
    "verbatimModuleSyntax", "erasableSyntaxOnly",
    // Completeness
    "skipDefaultLibCheck", "skipLibCheck",
];

/// The order for the object at `path`, a dotted list of keys from the root, in the given kind of file.
fn order_for(file: &str, path: &str) -> Option<Order> {
    let is_tsconfig = file == "tsconfig.json" || (file.starts_with("tsconfig.") && file.ends_with(".json"));
    match (file, path) {
        ("package.json", "") => Some(Order::Listed(PACKAGE_JSON)),
        ("package.json", "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies" | "bundledDependencies" | "peerDependenciesMeta") => Some(Order::Ascending),
        ("package.json", "resolutions" | "overrides" | "pnpm.overrides") => Some(Order::Ascending),
        ("package.json", "gitHooks" | "husky" | "simple-git-hooks") => Some(Order::Listed(GIT_HOOKS)),
        ("package.json", path) if path.starts_with("exports") => Some(Order::Listed(EXPORTS)),
        (_, "") if is_tsconfig => Some(Order::Listed(TSCONFIG)),
        (_, "compilerOptions") if is_tsconfig => Some(Order::Listed(COMPILER_OPTIONS)),
        _ => None,
    }
}

/// One reordering: the ranges of the values to rewrite, and the text each one gets.
type Moves = Vec<((usize, usize), String)>;

fn range(node: &impl Ranged) -> (usize, usize) {
    (node.range().start, node.range().end)
}

fn object_moves(text: &str, object: &Object, order: &Order) -> Option<Moves> {
    let names: Vec<String> = object.properties.iter().map(|property| property.name.as_str().to_string()).collect();
    let mut sorted: Vec<usize> = (0..names.len()).collect();
    match order {
        Order::Ascending => sorted.sort_by(|&a, &b| names[a].cmp(&names[b])),
        Order::Listed(list) => {
            // A key that isn't listed keeps its place, and the listed ones are ordered around it.
            let position = |index: usize| list.iter().position(|name| *name == names[index]);
            let mut listed: Vec<usize> = sorted.iter().copied().filter(|&index| position(index).is_some()).collect();
            listed.sort_by_key(|&index| position(index));
            let mut listed = listed.into_iter();
            for slot in &mut sorted {
                if position(*slot).is_some() {
                    *slot = listed.next().expect("as many listed keys as slots for them");
                }
            }
        }
    }
    if sorted.iter().enumerate().all(|(slot, &index)| slot == index) {
        return None;
    }

    let ranges: Vec<(usize, usize)> = object.properties.iter().map(range).collect();
    Some(sorted.iter().enumerate().filter(|(slot, index)| slot != *index).map(|(slot, &index)| (ranges[slot], text[ranges[index].0..ranges[index].1].to_string())).collect())
}

/// The first object or array that is out of order, searching from the outside in.
fn find_moves(file: &str, text: &str, value: &Value, path: &str) -> Option<Moves> {
    match value {
        Value::Object(object) => {
            if let Some(moves) = order_for(file, path).and_then(|order| object_moves(text, object, &order)) {
                return Some(moves);
            }
            object.properties.iter().find_map(|property| {
                let name = property.name.as_str();
                let path = if path.is_empty() { name.to_string() } else { format!("{path}.{name}") };
                find_moves(file, text, &property.value, &path)
            })
        }
        // `files` in `package.json` is a sorted list.
        Value::Array(array) if file == "package.json" && path == "files" => {
            let strings: Vec<&str> = array.elements.iter().filter_map(|element| if let Value::StringLit(string) = element { Some(string.value.as_ref()) } else { None }).collect();
            if strings.len() != array.elements.len() {
                return None;
            }
            let mut sorted: Vec<usize> = (0..strings.len()).collect();
            sorted.sort_by(|&a, &b| strings[a].cmp(strings[b]));
            if sorted.iter().enumerate().all(|(slot, &index)| slot == index) {
                return None;
            }
            let ranges: Vec<(usize, usize)> = array.elements.iter().map(range).collect();
            Some(sorted.iter().enumerate().filter(|(slot, index)| slot != *index).map(|(slot, &index)| (ranges[slot], text[ranges[index].0..ranges[index].1].to_string())).collect())
        }
        _ => None,
    }
}

fn sort_keys(file: &str, text: &str) -> Result<String> {
    let mut text = text.to_string();
    // Each round fixes one object, so that the ranges of the ones nested in it are read afresh.
    for _ in 0..256 {
        let collect = CollectOptions { comments: CommentCollectionStrategy::Separate, tokens: false };
        let parsed = parse_to_ast(&text, &collect, &ParseOptions::default()).map_err(|error| anyhow!("{file}: {error}"))?;
        // Comments don't say which key they belong to, so a file with comments keeps its order.
        if parsed.comments.is_some_and(|comments| !comments.is_empty()) {
            break;
        }
        let Some(mut moves) = parsed.value.as_ref().and_then(|value| find_moves(file, &text, value, "")) else { break };

        moves.sort_by_key(|(range, _)| std::cmp::Reverse(range.0));
        for ((start, end), replacement) in moves {
            text.replace_range(start..end, &replacement);
        }
    }
    Ok(text)
}

/// Formats a JSON file, returning `None` when it is already formatted.
pub fn format_json(path: &Path, text: &str) -> Result<Option<String>> {
    let file = path.file_name().and_then(|name| name.to_str()).unwrap_or_default();
    let sorted = sort_keys(file, text)?;

    // The same content: equal values, where the one list that gets sorted is compared as a set.
    let value = |text: &str| {
        let mut value = parse_to_serde_value::<serde_json::Value>(text, &ParseOptions::default()).map_err(|error| anyhow!("{file}: {error}"))?;
        if let Some(files) = value.get_mut("files").and_then(|files| files.as_array_mut()).filter(|_| file == "package.json") {
            files.sort_by_key(|entry| entry.to_string());
        }
        anyhow::Ok(value)
    };
    if value(text)? != value(&sorted)? {
        bail!("{}: sorting the keys changed the content", path.display());
    }

    let config = ConfigurationBuilder::new().indent_width(4).trailing_commas(TrailingCommaKind::Never).package_json_apply_conventions(false).build();
    let formatted = dprint_plugin_json::format_text(path, &sorted, &config).map_err(|error| anyhow!("{}: {error}", path.display()))?.unwrap_or(sorted);
    Ok((formatted != text).then_some(formatted))
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::format_json;

    fn format(file: &str, text: &str) -> String {
        format_json(Path::new(file), text).unwrap().unwrap_or_else(|| text.to_string())
    }

    #[test]
    fn formatting() {
        assert_eq!(format("a.json", "{\"a\":1,\n  \"b\": [1,2],\"c\":{ \"d\":null}}\n"), "{ \"a\": 1, \"b\": [1, 2], \"c\": { \"d\": null } }\n");
        assert_eq!(format("a.json", "{\n\"a\":1,\"b\": [\n1,2],}\n"), "{\n    \"a\": 1,\n    \"b\": [\n        1,\n        2\n    ]\n}\n");
        assert_eq!(format("a.json", "{\n    \"b\": 1,\n    \"a\": 2\n}\n"), "{\n    \"b\": 1,\n    \"a\": 2\n}\n");
    }

    #[test]
    fn package_json() {
        assert_eq!(
            format("package.json", "{\n    \"devDependencies\": { \"b\": \"1\", \"a\": \"2\" },\n    \"custom\": true,\n    \"version\": \"1.0.0\",\n    \"files\": [\"dist\", \"README.md\"],\n    \"name\": \"x\",\n    \"exports\": { \".\": { \"default\": \"./a.js\", \"types\": \"./a.d.ts\" } }\n}\n"),
            "{\n    \"name\": \"x\",\n    \"custom\": true,\n    \"version\": \"1.0.0\",\n    \"exports\": { \".\": { \"types\": \"./a.d.ts\", \"default\": \"./a.js\" } },\n    \"files\": [\"README.md\", \"dist\"],\n    \"devDependencies\": { \"a\": \"2\", \"b\": \"1\" }\n}\n",
        );
    }

    #[test]
    fn tsconfig() {
        assert_eq!(
            format("tsconfig.build.json", "{\n    \"include\": [\"src\"],\n    \"compilerOptions\": {\n        \"strict\": true,\n        \"target\": \"esnext\"\n    },\n    \"extends\": \"./tsconfig.json\"\n}\n"),
            "{\n    \"extends\": \"./tsconfig.json\",\n    \"compilerOptions\": {\n        \"target\": \"esnext\",\n        \"strict\": true\n    },\n    \"include\": [\"src\"]\n}\n",
        );
        // A comment doesn't say which key it belongs to.
        assert_eq!(format("tsconfig.json", "{\n    // base\n    \"include\": [\"src\"],\n    \"extends\": \"./a.json\"\n}\n"), "{\n    // base\n    \"include\": [\"src\"],\n    \"extends\": \"./a.json\"\n}\n");
    }
}
