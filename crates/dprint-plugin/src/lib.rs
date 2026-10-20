mod configuration;
#[doc(hidden)]
pub mod devtools;
mod edits;
mod format;
mod json;
#[cfg(target_arch = "wasm32")]
mod plugin;
mod rules;
mod source;
mod verify;

pub use configuration::Configuration;
pub use format::format_text;
