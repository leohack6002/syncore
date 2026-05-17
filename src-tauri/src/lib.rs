use std::{
    collections::HashMap,
    io::{ErrorKind, Read, Write},
    net::TcpListener,
    sync::{Arc, Mutex, OnceLock},
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
const HTTP_TIMEOUT_SECS: u64 = 25;
const HTTP_CONNECT_TIMEOUT_SECS: u64 = 10;
const SOCKET_RETRY_DELAY_MS: u64 = 25;
const OAUTH_READ_TIMEOUT_SECS: u64 = 120;

static HTTP_CLIENT: OnceLock<reqwest::blocking::Client> = OnceLock::new();

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

#[derive(Serialize)]
struct DesktopTokenExchange<'a> {
    client_id: &'a str,
    code: &'a str,
    code_verifier: &'a str,
    grant_type: &'static str,
    redirect_uri: &'a str,
}

#[derive(Serialize)]
struct DesktopTokenRefresh<'a> {
    client_id: &'a str,
    grant_type: &'static str,
    refresh_token: &'a str,
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
    let port = listener
        .local_addr()
        .map_err(|error| error.to_string())?
        .port();
    let redirect_uri = format!("http://127.0.0.1:{port}");
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

    let auth_url = desktop_pkce_authorization_url(
        &input.client_id,
        &redirect_uri,
        &scopes,
        &state,
        &challenge,
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
async fn gmail_api_request(input: GmailRequestInput) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || gmail_api_request_blocking(input))
        .await
        .map_err(|error| format!("Gmail worker failed: {error}"))?
}

fn gmail_api_request_blocking(input: GmailRequestInput) -> Result<Value, String> {
    let tokens = load_tokens(&input.account_id)?;
    let tokens = ensure_fresh_token(&input.account_id, tokens)?;
    let path = if input.path.starts_with('/') {
        input.path
    } else {
        format!("/{}", input.path)
    };
    let url = format!("{GMAIL_BASE_URL}{path}");
    let client = http_client()?;
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

    let response = send_with_retry(request).map_err(|error| {
        format!(
            "Gmail API request failed: {}",
            network_error_message(&error)
        )
    })?;
    let status = response.status();
    let body = response.text().map_err(|error| {
        format!(
            "Could not read Gmail API response: {}",
            network_error_message(&error)
        )
    })?;
    if !status.is_success() {
        return Err(google_api_error_message(status, &body));
    }

    serde_json::from_str(&body).map_err(|error| format!("Gmail API returned invalid JSON: {error}"))
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
    stream
        .set_nonblocking(false)
        .map_err(|error| format!("Could not configure OAuth callback socket: {error}"))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(OAUTH_READ_TIMEOUT_SECS)))
        .map_err(|error| format!("Could not configure OAuth callback timeout: {error}"))?;

    let mut buffer = [0; 4096];
    let bytes_read = read_oauth_callback(&mut stream, &mut buffer)?;
    let request = String::from_utf8_lossy(&buffer[..bytes_read]);
    let request_line = request
        .lines()
        .next()
        .ok_or_else(|| "OAuth callback request was empty.".to_string())?;
    let path = request_line
        .split_whitespace()
        .nth(1)
        .ok_or_else(|| "OAuth callback path was missing.".to_string())?;
    let callback_url =
        Url::parse(&format!("http://127.0.0.1{path}")).map_err(|error| error.to_string())?;
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

    query.get("code").cloned().ok_or_else(|| {
        query
            .get("error")
            .cloned()
            .unwrap_or_else(|| "OAuth code was missing.".into())
    })
}

fn exchange_code(
    client_id: &str,
    redirect_uri: &str,
    verifier: &str,
    code: &str,
) -> Result<TokenSet, String> {
    let client = http_client()?;
    let form = DesktopTokenExchange {
        client_id,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri,
    };

    let response = client
        .post(GOOGLE_TOKEN_URL)
        .form(&form)
        .send_with_retry()
        .map_err(|error| {
            format!(
                "Google token exchange failed: {}",
                network_error_message(&error)
            )
        })?;
    parse_token_response(response, client_id)
}

fn refresh_access_token(account_id: &str, refresh_token: &str) -> Result<TokenSet, String> {
    let existing = load_tokens(account_id)?;
    let client_id = existing.client_id;
    let client = http_client()?;
    let form = DesktopTokenRefresh {
        client_id: client_id.as_str(),
        grant_type: "refresh_token",
        refresh_token,
    };

    let response = client
        .post(GOOGLE_TOKEN_URL)
        .form(&form)
        .send_with_retry()
        .map_err(|error| {
            format!(
                "Google token refresh failed: {}",
                network_error_message(&error)
            )
        })?;
    let mut refreshed = parse_token_response(response, &client_id)?;
    refreshed.refresh_token = Some(refresh_token.to_string());
    store_tokens(account_id, &refreshed)?;
    Ok(refreshed)
}

fn parse_token_response(
    response: reqwest::blocking::Response,
    client_id: &str,
) -> Result<TokenSet, String> {
    let status = response.status();
    let value: Value = response
        .json()
        .map_err(|_| "Google token endpoint returned an unreadable response.".to_string())?;
    if !status.is_success() {
        eprintln!("[Syncora OAuth] Token exchange failed: status={status} body={value}");
        return Err(token_endpoint_error(status, &value));
    }

    let access_token = value
        .get("access_token")
        .and_then(Value::as_str)
        .ok_or_else(|| "Token response did not include an access token.".to_string())?
        .to_string();
    let expires_in = value
        .get("expires_in")
        .and_then(Value::as_i64)
        .unwrap_or(3600);
    let refresh_token = value
        .get("refresh_token")
        .and_then(Value::as_str)
        .map(str::to_string);
    let scope = value
        .get("scope")
        .and_then(Value::as_str)
        .unwrap_or("")
        .to_string();

    Ok(TokenSet {
        client_id: client_id.to_string(),
        access_token,
        refresh_token,
        expires_at: now_timestamp() + expires_in,
        scope,
    })
}

fn desktop_pkce_authorization_url(
    client_id: &str,
    redirect_uri: &str,
    scopes: &[String],
    state: &str,
    challenge: &str,
) -> String {
    let mut params = url::form_urlencoded::Serializer::new(String::new());
    params.append_pair("client_id", client_id);
    params.append_pair("redirect_uri", redirect_uri);
    params.append_pair("response_type", "code");
    params.append_pair("scope", &scopes.join(" "));
    params.append_pair("access_type", "offline");
    params.append_pair("prompt", "consent");
    params.append_pair("state", state);
    params.append_pair("code_challenge", challenge);
    params.append_pair("code_challenge_method", "S256");

    format!("{GOOGLE_AUTH_URL}?{}", params.finish())
}

fn token_endpoint_error(status: reqwest::StatusCode, value: &Value) -> String {
    format!(
        "Token exchange failed: {} - {} (raw: {status})",
        value
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("unknown"),
        value
            .get("error_description")
            .and_then(Value::as_str)
            .unwrap_or("no description")
    )
}

fn gmail_profile(access_token: &str) -> Result<Value, String> {
    let response = http_client()?
        .get(format!("{GMAIL_BASE_URL}/profile"))
        .bearer_auth(access_token)
        .send_with_retry()
        .map_err(|error| {
            format!(
                "Gmail profile request failed: {}",
                network_error_message(&error)
            )
        })?;
    let status = response.status();
    let value = response
        .json::<Value>()
        .map_err(|error| error.to_string())?;
    if status.is_success() {
        Ok(value)
    } else {
        Err("Gmail profile request failed. Please reconnect Gmail and try again.".to_string())
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

fn http_client() -> Result<reqwest::blocking::Client, String> {
    if let Some(client) = HTTP_CLIENT.get() {
        return Ok(client.clone());
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(HTTP_TIMEOUT_SECS))
        .connect_timeout(Duration::from_secs(HTTP_CONNECT_TIMEOUT_SECS))
        .build()
        .map_err(|error| format!("Could not create HTTP client: {error}"))?;

    match HTTP_CLIENT.set(client.clone()) {
        Ok(()) => Ok(client),
        Err(_) => Ok(HTTP_CLIENT
            .get()
            .expect("HTTP client should be initialized after set failure")
            .clone()),
    }
}

fn read_oauth_callback(
    stream: &mut std::net::TcpStream,
    buffer: &mut [u8],
) -> Result<usize, String> {
    let deadline = Instant::now() + Duration::from_secs(OAUTH_READ_TIMEOUT_SECS);

    loop {
        match stream.read(buffer) {
            Ok(0) => {
                return Err("OAuth callback connection closed before sending a request.".into())
            }
            Ok(bytes_read) => return Ok(bytes_read),
            Err(error) if error.kind() == ErrorKind::WouldBlock && Instant::now() < deadline => {
                thread::sleep(Duration::from_millis(SOCKET_RETRY_DELAY_MS));
            }
            Err(error) if error.kind() == ErrorKind::WouldBlock => {
                return Err("OAuth callback socket was not ready before the timeout.".into());
            }
            Err(error) => return Err(format!("OAuth callback read failed: {error}")),
        }
    }
}

fn send_with_retry(
    request: reqwest::blocking::RequestBuilder,
) -> Result<reqwest::blocking::Response, reqwest::Error> {
    let mut last_error = None;

    for attempt in 0..3 {
        let Some(current_request) = request.try_clone() else {
            return request.send();
        };

        match current_request.send() {
            Ok(response) => return Ok(response),
            Err(error) if is_retryable_network_error(&error) && attempt < 2 => {
                last_error = Some(error);
                thread::sleep(Duration::from_millis(150 * (attempt + 1) as u64));
            }
            Err(error) => return Err(error),
        }
    }

    match last_error {
        Some(error) => Err(error),
        None => request.send(),
    }
}

trait RequestBuilderRetry {
    fn send_with_retry(self) -> Result<reqwest::blocking::Response, reqwest::Error>;
}

impl RequestBuilderRetry for reqwest::blocking::RequestBuilder {
    fn send_with_retry(self) -> Result<reqwest::blocking::Response, reqwest::Error> {
        send_with_retry(self)
    }
}

fn is_retryable_network_error(error: &reqwest::Error) -> bool {
    let message = error.to_string().to_lowercase();
    error.is_timeout()
        || error.is_connect()
        || message.contains("would block")
        || message.contains("10035")
        || message.contains("temporarily unavailable")
}

fn network_error_message(error: &reqwest::Error) -> String {
    if is_retryable_network_error(error) {
        "Network request was temporarily unavailable. Please retry when the connection is stable."
            .to_string()
    } else {
        error.to_string()
    }
}

fn google_api_error_message(status: reqwest::StatusCode, body: &str) -> String {
    let lower = body.to_lowercase();
    if status.as_u16() == 401 || status.as_u16() == 403 || lower.contains("invalid_grant") {
        return "Gmail authorization failed. Please reconnect the account and try again."
            .to_string();
    }
    if status.as_u16() == 429
        || status.as_u16() == 503
        || lower.contains("rate")
        || lower.contains("quota")
    {
        return "Gmail is busy right now. Syncora will retry when the service is available."
            .to_string();
    }
    if status.is_server_error() {
        return "Gmail is temporarily unavailable. Please retry sync in a moment.".to_string();
    }
    format!("Gmail request failed with status {status}.")
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
        .unwrap_or_else(|error| eprintln!("Syncora could not start cleanly: {error}"));
}
