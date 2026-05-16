use std::{
    collections::HashMap,
    io::{ErrorKind, Read, Write},
    net::TcpListener,
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use keyring::Entry;
use rand::{distributions::Alphanumeric, Rng};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use tauri::State;
use tauri_plugin_opener::OpenerExt;
use url::Url;

const TOKEN_SERVICE: &str = "syncora.gmail.tokens";
const GOOGLE_AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const GMAIL_BASE_URL: &str = "https://gmail.googleapis.com/gmail/v1/users/me";

#[derive(Default)]
struct OAuthSessions(Arc<Mutex<HashMap<String, OAuthSession>>>);

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OAuthSession {
    id: String,
    auth_url: String,
    redirect_uri: String,
    status: OAuthStatus,
    account: Option<ConnectedAccount>,
    error: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum OAuthStatus {
    Waiting,
    Connected,
    Failed,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConnectedAccount {
    id: String,
    email: String,
    display_name: String,
    avatar_url: Option<String>,
    color: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TokenSet {
    client_id: String,
    access_token: String,
    refresh_token: Option<String>,
    expires_at: i64,
    scope: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct StartOAuthInput {
    client_id: String,
    scopes: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GmailRequestInput {
    account_id: String,
    path: String,
    method: Option<String>,
    body: Option<Value>,
}

#[tauri::command]
fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[tauri::command]
fn start_google_oauth(
    input: StartOAuthInput,
    sessions: State<'_, OAuthSessions>,
    app: tauri::AppHandle,
) -> Result<OAuthSession, String> {
    if input.client_id.trim().is_empty() {
        return Err("Missing Google OAuth client id.".into());
    }

    let listener = TcpListener::bind("127.0.0.1:0").map_err(|error| error.to_string())?;
    listener
        .set_nonblocking(false)
        .map_err(|error| error.to_string())?;
    let port = listener.local_addr().map_err(|error| error.to_string())?.port();
    let redirect_uri = format!("http://127.0.0.1:{port}/oauth/google/callback");
    let session_id = random_string(24);
    let state = random_string(32);
    let verifier = random_string(96);
    let challenge = URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let scopes = if input.scopes.is_empty() {
        vec![
            "https://www.googleapis.com/auth/gmail.readonly".to_string(),
            "https://www.googleapis.com/auth/userinfo.email".to_string(),
            "openid".to_string(),
        ]
    } else {
        input.scopes
    };

    let auth_url = format!(
        "{GOOGLE_AUTH_URL}?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent&state={}&code_challenge={}&code_challenge_method=S256",
        urlencoding::encode(&input.client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(&scopes.join(" ")),
        urlencoding::encode(&state),
        urlencoding::encode(&challenge)
    );

    let session = OAuthSession {
        id: session_id.clone(),
        auth_url: auth_url.clone(),
        redirect_uri: redirect_uri.clone(),
        status: OAuthStatus::Waiting,
        account: None,
        error: None,
    };

    sessions
        .0
        .lock()
        .map_err(|_| "OAuth session store is unavailable.".to_string())?
        .insert(session_id.clone(), session.clone());

    let session_map = sessions.0.clone();
    let client_id = input.client_id;
    let session_id_for_thread = session_id.clone();

    thread::spawn(move || {
        let result = receive_oauth_code(listener, &state)
            .and_then(|code| exchange_code(&client_id, &redirect_uri, &verifier, &code))
            .and_then(|tokens| {
                let profile = gmail_profile(&tokens.access_token)?;
                let email = profile
                    .get("emailAddress")
                    .and_then(Value::as_str)
                    .ok_or_else(|| "Gmail profile did not include an email address.".to_string())?
                    .to_string();
                let account = ConnectedAccount {
                    id: account_id_for_email(&email),
                    display_name: email.split('@').next().unwrap_or("Gmail").to_string(),
                    email,
                    avatar_url: None,
                    color: account_color(),
                };
                store_tokens(&account.id, &tokens)?;
                Ok(account)
            });

        if let Ok(mut sessions) = session_map.lock() {
            if let Some(session) = sessions.get_mut(&session_id_for_thread) {
                match result {
                    Ok(account) => {
                        session.status = OAuthStatus::Connected;
                        session.account = Some(account);
                        session.error = None;
                    }
                    Err(error) => {
                        session.status = OAuthStatus::Failed;
                        session.error = Some(error);
                    }
                }
            }
        }
    });

    app.opener()
        .open_url(auth_url, None::<&str>)
        .map_err(|error| error.to_string())?;

    Ok(session)
}

#[tauri::command]
fn oauth_session_status(
    session_id: String,
    sessions: State<'_, OAuthSessions>,
) -> Result<OAuthSession, String> {
    sessions
        .0
        .lock()
        .map_err(|_| "OAuth session store is unavailable.".to_string())?
        .get(&session_id)
        .cloned()
        .ok_or_else(|| "OAuth session not found.".to_string())
}

#[tauri::command]
fn gmail_api_request(input: GmailRequestInput) -> Result<Value, String> {
    let tokens = load_tokens(&input.account_id)?;
    let tokens = ensure_fresh_token(&input.account_id, tokens)?;
    let path = if input.path.starts_with('/') {
        input.path
    } else {
        format!("/{}", input.path)
    };
    let url = format!("{GMAIL_BASE_URL}{path}");
    let client = reqwest::blocking::Client::new();
    let method = input.method.unwrap_or_else(|| "GET".to_string());
    let request = match method.as_str() {
        "POST" => client.post(url),
        "PATCH" => client.patch(url),
        "DELETE" => client.delete(url),
        _ => client.get(url),
    }
    .bearer_auth(tokens.access_token);

    let request = if let Some(body) = input.body {
        request.json(&body)
    } else {
        request
    };

    let response = request.send().map_err(|error| error.to_string())?;
    let status = response.status();
    let body = response.text().map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(format!("Gmail API returned {status}: {body}"));
    }

    serde_json::from_str(&body).map_err(|error| error.to_string())
}

#[tauri::command]
fn logout_google_account(account_id: String) -> Result<(), String> {
    delete_tokens(&account_id)
}

fn receive_oauth_code(listener: TcpListener, expected_state: &str) -> Result<String, String> {
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;

    let deadline = Instant::now() + Duration::from_secs(180);
    let (mut stream, _) = loop {
        match listener.accept() {
            Ok(connection) => break connection,
            Err(error) if error.kind() == ErrorKind::WouldBlock && Instant::now() < deadline => {
                thread::sleep(Duration::from_millis(100));
            }
            Err(error) if error.kind() == ErrorKind::WouldBlock => {
                return Err("OAuth callback timed out.".into());
            }
            Err(error) => return Err(error.to_string()),
        }
    };
    let mut buffer = [0; 4096];
    let bytes_read = stream.read(&mut buffer).map_err(|error| error.to_string())?;
    let request = String::from_utf8_lossy(&buffer[..bytes_read]);
    let request_line = request
        .lines()
        .next()
        .ok_or_else(|| "OAuth callback request was empty.".to_string())?;
    let path = request_line
        .split_whitespace()
        .nth(1)
        .ok_or_else(|| "OAuth callback path was missing.".to_string())?;
    let callback_url = Url::parse(&format!("http://127.0.0.1{path}")).map_err(|error| error.to_string())?;
    let query: HashMap<String, String> = callback_url.query_pairs().into_owned().collect();

    let response_body = "<html><body style=\"background:#07090f;color:#f8fafc;font-family:system-ui;padding:32px\"><h1>Syncora connected</h1><p>You can return to Syncora.</p></body></html>";
    let response = format!(
        "HTTP/1.1 200 OK\r\ncontent-type: text/html; charset=utf-8\r\ncontent-length: {}\r\n\r\n{}",
        response_body.len(),
        response_body
    );
    stream
        .write_all(response.as_bytes())
        .map_err(|error| error.to_string())?;

    if query.get("state").map(String::as_str) != Some(expected_state) {
        return Err("OAuth state mismatch.".into());
    }

    query
        .get("code")
        .cloned()
        .ok_or_else(|| query.get("error").cloned().unwrap_or_else(|| "OAuth code was missing.".into()))
}

fn exchange_code(
    client_id: &str,
    redirect_uri: &str,
    verifier: &str,
    code: &str,
) -> Result<TokenSet, String> {
    let client = reqwest::blocking::Client::new();
    let response = client
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("client_id", client_id),
            ("redirect_uri", redirect_uri),
            ("grant_type", "authorization_code"),
            ("code_verifier", verifier),
            ("code", code),
        ])
        .send()
        .map_err(|error| error.to_string())?;
    parse_token_response(response, client_id)
}

fn refresh_access_token(account_id: &str, refresh_token: &str) -> Result<TokenSet, String> {
    let existing = load_tokens(account_id)?;
    let client_id = existing.client_id;
    let client = reqwest::blocking::Client::new();
    let response = client
        .post(GOOGLE_TOKEN_URL)
        .form(&[
            ("client_id", client_id.as_str()),
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
        ])
        .send()
        .map_err(|error| error.to_string())?;
    let mut refreshed = parse_token_response(response, &client_id)?;
    refreshed.refresh_token = Some(refresh_token.to_string());
    store_tokens(account_id, &refreshed)?;
    Ok(refreshed)
}

fn parse_token_response(response: reqwest::blocking::Response, client_id: &str) -> Result<TokenSet, String> {
    let status = response.status();
    let value: Value = response.json().map_err(|error| error.to_string())?;
    if !status.is_success() {
        return Err(format!("Google token endpoint returned {status}: {value}"));
    }

    let access_token = value
        .get("access_token")
        .and_then(Value::as_str)
        .ok_or_else(|| "Token response did not include an access token.".to_string())?
        .to_string();
    let expires_in = value.get("expires_in").and_then(Value::as_i64).unwrap_or(3600);
    let refresh_token = value.get("refresh_token").and_then(Value::as_str).map(str::to_string);
    let scope = value.get("scope").and_then(Value::as_str).unwrap_or("").to_string();

    Ok(TokenSet {
        client_id: client_id.to_string(),
        access_token,
        refresh_token,
        expires_at: now_timestamp() + expires_in,
        scope,
    })
}

fn gmail_profile(access_token: &str) -> Result<Value, String> {
    let response = reqwest::blocking::Client::new()
        .get(format!("{GMAIL_BASE_URL}/profile"))
        .bearer_auth(access_token)
        .send()
        .map_err(|error| error.to_string())?;
    let status = response.status();
    let value = response.json::<Value>().map_err(|error| error.to_string())?;
    if status.is_success() {
        Ok(value)
    } else {
        Err(format!("Gmail profile request failed: {value}"))
    }
}

fn ensure_fresh_token(account_id: &str, tokens: TokenSet) -> Result<TokenSet, String> {
    if tokens.expires_at > now_timestamp() + 90 {
        return Ok(tokens);
    }

    let refresh_token = tokens
        .refresh_token
        .clone()
        .ok_or_else(|| "Account is missing a refresh token. Please reconnect Gmail.".to_string())?;
    refresh_access_token(account_id, &refresh_token)
}

fn store_tokens(account_id: &str, tokens: &TokenSet) -> Result<(), String> {
    let entry = Entry::new(TOKEN_SERVICE, account_id).map_err(|error| error.to_string())?;
    entry
        .set_password(&serde_json::to_string(tokens).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())
}

fn load_tokens(account_id: &str) -> Result<TokenSet, String> {
    let entry = Entry::new(TOKEN_SERVICE, account_id).map_err(|error| error.to_string())?;
    let raw = entry.get_password().map_err(|error| error.to_string())?;
    serde_json::from_str(&raw).map_err(|error| error.to_string())
}

fn delete_tokens(account_id: &str) -> Result<(), String> {
    let entry = Entry::new(TOKEN_SERVICE, account_id).map_err(|error| error.to_string())?;
    match entry.delete_credential() {
        Ok(_) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn random_string(length: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

fn account_id_for_email(email: &str) -> String {
    format!("gmail_{}", URL_SAFE_NO_PAD.encode(email.to_lowercase()))
}

fn account_color() -> String {
    let colors = ["#2cdaff", "#9b7cff", "#62f3a5", "#ffcc66", "#ff7ab6"];
    colors[rand::thread_rng().gen_range(0..colors.len())].to_string()
}

fn now_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub fn run() {
    tauri::Builder::default()
        .manage(OAuthSessions::default())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            app_version,
            start_google_oauth,
            oauth_session_status,
            gmail_api_request,
            logout_google_account
        ])
        .run(tauri::generate_context!())
        .expect("error while running Syncora");
}
