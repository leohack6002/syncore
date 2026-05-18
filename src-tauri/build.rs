fn main() {
    if let Ok(contents) = std::fs::read_to_string(".env") {
        for line in contents.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some(val) = line.strip_prefix("GOOGLE_CLIENT_SECRET=") {
                println!("cargo:rustc-env=GOOGLE_CLIENT_SECRET={}", val.trim());
            }
            if let Some(val) = line.strip_prefix("ANTHROPIC_API_KEY=") {
                println!("cargo:rustc-env=ANTHROPIC_API_KEY={}", val.trim());
            }
        }
    }
    tauri_build::build()
}
