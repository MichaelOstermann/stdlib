/// Replacements of byte ranges in the original text, collected by the rules and applied in one go.
#[derive(Default)]
pub struct Edits {
    edits: Vec<Edit>,
}

struct Edit {
    start: usize,
    end: usize,
    text: String,
}

impl Edits {
    pub fn delete(&mut self, start: usize, end: usize) {
        self.replace(start, end, "");
    }

    pub fn replace(&mut self, start: usize, end: usize, text: impl Into<String>) {
        let text = text.into();
        if start < end || !text.is_empty() {
            self.edits.push(Edit { start, end, text });
        }
    }

    pub fn is_empty(&self) -> bool {
        self.edits.is_empty()
    }

    pub fn apply(mut self, text: &str) -> String {
        self.edits.sort_by_key(|edit| (edit.start, edit.end));

        let mut output = String::with_capacity(text.len());
        let mut position = 0;
        for edit in &self.edits {
            assert!(edit.start >= position, "overlapping edits at byte {}", edit.start);
            output.push_str(&text[position..edit.start]);
            output.push_str(&edit.text);
            position = edit.end;
        }
        output.push_str(&text[position..]);
        output
    }
}
