//! What the tests of the rules share: formatting a snippet as a `.ts` or a `.tsx` file.

use std::path::Path;

use crate::Configuration;
use crate::format_text;

fn format_as(path: &str, text: &str) -> String {
    format_text(Path::new(path), text, &Configuration::default()).unwrap().unwrap_or_else(|| text.to_string())
}

pub fn format(text: &str) -> String {
    format_as("test.ts", text)
}

pub fn format_tsx(text: &str) -> String {
    format_as("test.tsx", text)
}

pub fn unchanged(text: &str) {
    assert_eq!(format(text), text);
}

pub fn unchanged_tsx(text: &str) {
    assert_eq!(format_tsx(text), text);
}
