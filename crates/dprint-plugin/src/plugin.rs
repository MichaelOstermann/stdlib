use dprint_core::configuration::ConfigKeyMap;
use dprint_core::configuration::GlobalConfiguration;
use dprint_core::configuration::get_unknown_property_diagnostics;
use dprint_core::generate_plugin_code;
use dprint_core::plugins::CheckConfigUpdatesMessage;
use dprint_core::plugins::ConfigChange;
use dprint_core::plugins::FileMatchingInfo;
use dprint_core::plugins::FormatError;
use dprint_core::plugins::FormatResult;
use dprint_core::plugins::PluginInfo;
use dprint_core::plugins::PluginResolveConfigurationResult;
use dprint_core::plugins::SyncFormatRequest;
use dprint_core::plugins::SyncHostFormatRequest;
use dprint_core::plugins::SyncPluginHandler;

use crate::Configuration;
use crate::format_text;

struct Handler;

impl SyncPluginHandler<Configuration> for Handler {
    fn plugin_info(&mut self) -> PluginInfo {
        PluginInfo {
            name: env!("CARGO_PKG_NAME").to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            config_key: "stdlibStyle".to_string(),
            help_url: "https://github.com/MichaelOstermann/stdlib/tree/main/packages/stdlib-style".to_string(),
            config_schema_url: String::new(),
            update_url: None,
        }
    }

    fn license_text(&mut self) -> String {
        "MIT".to_string()
    }

    fn resolve_config(&mut self, config: ConfigKeyMap, _global_config: &GlobalConfiguration) -> PluginResolveConfigurationResult<Configuration> {
        PluginResolveConfigurationResult {
            config: Configuration::default(),
            diagnostics: get_unknown_property_diagnostics(config),
            file_matching: FileMatchingInfo {
                file_extensions: ["js", "jsx", "ts", "tsx", "mjs", "cjs", "mts", "cts", "json", "jsonc"].map(String::from).to_vec(),
                file_names: vec![],
                additive: false,
            },
        }
    }

    fn check_config_updates(&self, _message: CheckConfigUpdatesMessage) -> Result<Vec<ConfigChange>, FormatError> {
        Ok(vec![])
    }

    fn format(&mut self, request: SyncFormatRequest<Configuration>, _format_with_host: impl FnMut(SyncHostFormatRequest) -> FormatResult) -> FormatResult {
        let text = String::from_utf8(request.file_bytes)?;
        let formatted = format_text(request.file_path, &text, request.config).map_err(|error| error.to_string())?;
        Ok(formatted.map(String::into_bytes))
    }
}

generate_plugin_code!(Handler, Handler);
