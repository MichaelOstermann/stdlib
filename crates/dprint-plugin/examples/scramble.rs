//! Rewrites the given files in place with scrambled spacing, to produce input for comparing this formatter
//! with another one. Usage: `cargo run --release --example scramble -- <seed> <file>...`

use std::env;
use std::fs;
use std::path::Path;

use dprint_plugin_stdlib_style::devtools::scramble_spacing;

fn main() {
    let mut arguments = env::args().skip(1);
    let seed: u64 = arguments.next().and_then(|seed| seed.parse().ok()).expect("first argument should be a numeric seed");

    for (index, file) in arguments.enumerate() {
        let path = Path::new(&file);
        let text = fs::read_to_string(path).expect("file should be readable");
        match scramble_spacing(path, &text, seed + index as u64) {
            Ok(scrambled) => fs::write(path, scrambled).expect("file should be writable"),
            Err(error) => eprintln!("skipped {error}"),
        }
    }
}
