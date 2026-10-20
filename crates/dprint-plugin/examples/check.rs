//! Formats every source file under the given directories without writing anything,
//! and reports which files would change or fail. Usage: `cargo run --release --example check -- [--diff] [--write] <dir>...`
//!
//! `--diff` prints the lines that would change, `--write` formats the files in place, and `--flatten`
//! checks instead that each file formats the same with all of its indentation removed.

use std::env;
use std::fs;
use std::path::Path;
use std::path::PathBuf;
use std::process::ExitCode;
use std::time::Instant;

use dprint_plugin_stdlib_style::Configuration;
use dprint_plugin_stdlib_style::devtools::flatten_indentation;
use dprint_plugin_stdlib_style::format_text;

const EXTENSIONS: [&str; 10] = ["js", "jsx", "ts", "tsx", "mjs", "cjs", "mts", "cts", "json", "jsonc"];
const IGNORED: [&str; 6] = ["node_modules", "dist", "target", "gen", ".git", ".vitepress"];

fn collect(dir: &Path, files: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name();
        if path.is_dir() {
            if !IGNORED.contains(&name.to_string_lossy().as_ref()) {
                collect(&path, files);
            }
        }
        else if path.extension().is_some_and(|extension| EXTENSIONS.contains(&extension.to_string_lossy().as_ref())) {
            files.push(path);
        }
    }
}

fn main() -> ExitCode {
    let (flags, dirs): (Vec<String>, Vec<String>) = env::args().skip(1).partition(|argument| argument.starts_with("--"));
    let (diff, write) = (flags.iter().any(|flag| flag == "--diff"), flags.iter().any(|flag| flag == "--write"));
    let flatten = flags.iter().any(|flag| flag == "--flatten");

    let mut files = Vec::new();
    for dir in dirs {
        collect(Path::new(&dir), &mut files);
    }
    files.sort();

    let config = Configuration::default();
    let started = Instant::now();
    let (mut changed, mut failed) = (0, 0);

    for path in &files {
        let Ok(text) = fs::read_to_string(path) else { continue };

        // JSON is laid out afresh by its own formatter, so there is no indentation to compare.
        let is_json = path.extension().is_some_and(|extension| extension == "json" || extension == "jsonc");
        if flatten && is_json {
            continue;
        }
        if flatten {
            let expected = format_text(path, &text, &config).ok().map(|formatted| formatted.unwrap_or_else(|| text.clone()));
            let flattened = flatten_indentation(path, &text).and_then(|flat| Ok(format_text(path, &flat, &config)?.unwrap_or(flat)));
            // A file that opts out of formatting comes back flattened and untouched.
            let ignored = |flattened: &String| *flattened == flatten_indentation(path, &text).unwrap_or_default() && *flattened != text;
            match (expected, flattened) {
                (_, Ok(flattened)) if ignored(&flattened) => {}
                (Some(expected), Ok(flattened)) if expected != flattened => {
                    changed += 1;
                    println!("differs {}", path.display());
                    if diff {
                        print_diff(&expected, &flattened);
                    }
                }
                (_, Err(error)) => {
                    failed += 1;
                    println!("failed  {error}");
                }
                _ => {}
            }
            continue;
        }
        match format_text(path, &text, &config) {
            Ok(None) => {}
            Ok(Some(formatted)) => {
                changed += 1;
                println!("changed {}", path.display());
                if diff {
                    print_diff(&text, &formatted);
                }
                if write {
                    fs::write(path, formatted).expect("file should be writable");
                }
            }
            Err(error) => {
                failed += 1;
                println!("failed  {error}");
            }
        }
    }

    println!("{} files, {changed} changed, {failed} failed, {:?}", files.len(), started.elapsed());
    if changed + failed == 0 { ExitCode::SUCCESS } else { ExitCode::FAILURE }
}

fn print_diff(before: &str, after: &str) {
    if before.lines().count() != after.lines().count() {
        println!("    (lines were added or removed)");
    }
    let mut after_lines = after.lines().peekable();
    for (index, line) in before.lines().enumerate() {
        if after_lines.peek() == Some(&line) {
            after_lines.next();
        }
        else if after_lines.peek().is_some_and(|next| next.split_whitespace().eq(line.split_whitespace()) || !line.trim().is_empty()) {
            println!("    {:>4} - {line}", index + 1);
            println!("         + {}", after_lines.next().unwrap_or_default());
        }
        else {
            println!("    {:>4} - {line}", index + 1);
        }
    }
}
