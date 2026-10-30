//! The tokenizer of @monstermann/stdlib-syntax-highlight: Irosashi compiled to WebAssembly, called from JS
//! through plain exports. Strings come in as UTF-8 written to memory from `alloc`, tokens go out as
//! pairs of a length in UTF-16 code units and the number of their class.

mod theme;

use irosashi::{HighlighterBuilder, Session, StateStack, Theme, TokenizeOptions};
use std::collections::HashMap;
use std::sync::Arc;

struct State {
    highlighter: irosashi::Highlighter,
    theme: Arc<Theme>,
    sessions: HashMap<String, Session>,
    // The last code highlighted, to tokenize only the lines that changed when it comes back edited
    last: Option<Tokenized>,
    out: Vec<u32>,
}

struct Tokenized {
    scope: String,
    lines: Vec<String>,
    // The state each line ends in, and its tokens without the line break
    states: Vec<StateStack>,
    tokens: Vec<Vec<(u32, u32)>>,
}

static mut STATE: Option<State> = None;

fn state() -> &'static mut State {
    unsafe { (*std::ptr::addr_of_mut!(STATE)).as_mut().unwrap() }
}

// The functions taking pointers are unsafe since only JS calls them, with memory it wrote from `alloc`
unsafe fn text(ptr: *const u8, len: usize) -> &'static str {
    unsafe { std::str::from_utf8_unchecked(std::slice::from_raw_parts(ptr, len)) }
}

#[unsafe(no_mangle)]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    let mut bytes = Vec::<u8>::with_capacity(len);
    let ptr = bytes.as_mut_ptr();
    std::mem::forget(bytes);
    ptr
}

/// Frees what `alloc` gave.
///
/// # Safety
///
/// The pointers and lengths are memory JS wrote to after `alloc`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, len: usize) {
    unsafe { drop(Vec::from_raw_parts(ptr, 0, len)) }
}

/// Starts the tokenizer, once.
#[unsafe(no_mangle)]
pub extern "C" fn init() {
    unsafe {
        STATE = Some(State {
            highlighter: HighlighterBuilder::without_bundled_assets().build().unwrap(),
            theme: Arc::new(theme::theme()),
            sessions: HashMap::new(),
            last: None,
            out: Vec::new(),
        });
    }
}

/// Adds a grammar. Every grammar a language embeds has to be added before it is first highlighted.
///
/// # Safety
///
/// The pointers and lengths are memory JS wrote to after `alloc`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn load(scope: *const u8, scope_len: usize, json: *const u8, json_len: usize) {
    let json = unsafe { text(json, json_len) }.as_bytes().to_vec();
    let scope = unsafe { text(scope, scope_len) }.to_ascii_lowercase();
    state().highlighter.load_language(&scope, json).unwrap();
}

/// Tokenizes `code` and returns where the tokens are, `highlight_len` numbers long.
///
/// # Safety
///
/// The pointers and lengths are memory JS wrote to after `alloc`.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn highlight(scope: *const u8, scope_len: usize, code: *const u8, code_len: usize) -> *const u32 {
    let state = state();
    let scope = unsafe { text(scope, scope_len) }.to_ascii_lowercase();
    if !state.sessions.contains_key(&scope) {
        let session = state.highlighter.session(&scope).unwrap();
        state.sessions.insert(scope.clone(), session);
    }
    let session = state.sessions.get_mut(&scope).unwrap();
    let lines: Vec<String> = unsafe { text(code, code_len) }.split('\n').map(str::to_owned).collect();
    let before = state.last.take().filter(|last| last.scope == scope);
    let tokenized = tokenize(session, &state.theme, scope, lines, before);
    flatten(&tokenized.tokens, &mut state.out);
    state.last = Some(tokenized);
    state.out.as_ptr()
}

#[unsafe(no_mangle)]
pub extern "C" fn highlight_len() -> usize {
    state().out.len()
}

fn tokenize(session: &mut Session, theme: &Arc<Theme>, scope: String, lines: Vec<String>, before: Option<Tokenized>) -> Tokenized {
    let mut states: Vec<StateStack> = Vec::with_capacity(lines.len());
    let mut tokens: Vec<Vec<(u32, u32)>> = Vec::with_capacity(lines.len());
    let empty = Tokenized { scope: String::new(), lines: Vec::new(), states: Vec::new(), tokens: Vec::new() };
    let before = before.unwrap_or(empty);
    let old = &before.lines;

    // Lines that are the same at the start keep their tokens, and so can the ones at the end once the state before them is the same again
    let mut start = 0;
    while start < lines.len() && start < old.len() && lines[start] == old[start] {
        states.push(before.states[start].clone());
        tokens.push(before.tokens[start].clone());
        start += 1;
    }
    let mut same = 0;
    while same < lines.len().min(old.len()) - start && lines[lines.len() - 1 - same] == old[old.len() - 1 - same] {
        same += 1;
    }
    let initial = session.initial_state();
    let mut current = if start > 0 { states[start - 1].clone() } else { initial.clone() };

    let mut i = start;
    while i < lines.len() {
        if i >= lines.len() - same {
            // The index of this line in the code before, counted from the end
            let j = i + old.len() - lines.len();
            let previous = if j > 0 { &before.states[j - 1] } else { &initial };
            if current == *previous {
                for k in j..old.len() {
                    states.push(before.states[k].clone());
                    tokens.push(before.tokens[k].clone());
                }
                break;
            }
        }
        let line = &lines[i];
        let result = session.tokenize_line(line, &current, i == 0, TokenizeOptions { max_line_length: None });
        let mut line_tokens = Vec::with_capacity(result.tokens.len());
        for token in &result.tokens {
            let length: usize = token.text(line).chars().map(char::len_utf16).sum();
            if length > 0 {
                line_tokens.push((length as u32, style(session, theme, token.scopes)));
            }
        }
        current = result.state;
        states.push(current.clone());
        tokens.push(line_tokens);
        i += 1;
    }

    Tokenized { scope, lines, states, tokens }
}

// The number of the token's class, read from the theme's foreground color, 0 for none
fn style(session: &mut Session, theme: &Arc<Theme>, scopes: irosashi::ScopeListId) -> u32 {
    let color = session.style(theme, scopes).color;
    color.and_then(|id| theme.color(id).trim_start_matches('#').parse().ok()).unwrap_or(0)
}

// The tokens of all lines with the line breaks between them, neighbours of the same style merged
fn flatten(lines: &[Vec<(u32, u32)>], out: &mut Vec<u32>) {
    out.clear();
    let mut push = |length: u32, style: u32| {
        let n = out.len();
        if n >= 2 && out[n - 1] == style {
            out[n - 2] += length;
        } else {
            out.push(length);
            out.push(style);
        }
    };
    for (i, line) in lines.iter().enumerate() {
        if i > 0 {
            push(1, 0);
        }
        for &(length, style) in line {
            push(length, style);
        }
    }
}
