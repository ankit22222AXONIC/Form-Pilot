# FormPilot — Sensitive Data Leak Map & Ingestion Inventory

This document maps all sensitive assets processed by FormPilot, their resting state, in-memory lifetime, decryption boundaries, and external transmission vectors.

---

## 1. Sensitive Data Classification & Flow Inventory

| Data Category | Storage Location | Encryption at Rest | Accessing Components | External Transmission | Residual / Remaining Risk |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Master Password** | Never stored in plaintext or ciphertext; discarded immediately after PBKDF2 derivation. | N/A (Transient memory only during unlock/change) | `authService`, `storageService`, `cryptoService` | **Never transmitted externally.** | Keylogger on local OS or memory dump during the exact millisecond of derivation. |
| **Vault Salt & Master Key** | Salt is stored in `chrome.storage.local` under `formpilot_vault_salt`. Master key is held as an in-memory `CryptoKey` (exportable base64 only in `chrome.storage.session`). | Salt is public random bytes. Session key is held in RAM and MV3 session storage (cleared on browser exit or 15m inactivity). | `authService`, `storageService`, `Dashboard.tsx`, `Popup.tsx` | **Never transmitted externally.** | Attacker with physical local machine access dumping Chrome renderer process memory while the vault is actively unlocked. |
| **Personal Vault Records** (Full Name, DoB, National IDs, Addresses, Phone Numbers, Educational & Career Records) | `chrome.storage.local` under key `formpilot_vault_data`. | **AES-GCM-256** authenticated encryption with PBKDF2-derived key (210,000 iterations, SHA-256). | `storageService.getVaultData()`, `Dashboard.tsx`, `matchingService` | **Never transmitted externally.** Vault records stay completely local. Vault records are never forwarded to AI or web page content scripts. | If user's master password is weak (e.g. dictionary word), an attacker obtaining the extension's LevelDB file from disk can run offline brute-force attacks. |
| **User API Keys in Vault** (e.g. user-stored API credentials in the vault dashboard) | Encrypted inside `formpilot_vault_data` in `chrome.storage.local`. | **AES-GCM-256** | `ApiKeysInfo.tsx` (view only). **Explicitly excluded from AI matching and form autofill.** | **Never transmitted externally.** | Same as personal vault records. Cannot be autofilled or leaked to web pages. |
| **AI Provider API Key** (Sarvam / OpenAI key used for form semantic analysis) | `chrome.storage.local` under key `formpilot_ai_config`. | Plaintext in Chrome's sandboxed local extension storage. | `aiService.ts`, `Settings.tsx`, `Popup.tsx` | Transmitted exclusively via HTTPS request header (`api-subscription-key` or `Authorization: Bearer`) to official endpoints (`api.sarvam.ai` or `api.openai.com`). | Chrome extensions lack hardware TPM isolation. Local malware or unauthorized OS users with filesystem access to Chrome's profile directory can read LevelDB files. |
| **Webpage Form Metadata** (Field IDs, element names, field labels, placeholders, enclosing form actions, current URL) | Transient in-memory state within `Popup.tsx` and injected content script (`detector.ts`). | Plaintext in RAM (cleared when popup closes). | `detector.ts`, `trustService.ts`, `aiService.ts`, `matchingService.ts`, `Popup.tsx` | **Sent to AI provider** (`api.sarvam.ai` or `api.openai.com`) for schema understanding when user clicks "Analyze Form". Form actions and URLs are evaluated locally by `trustService`. | If a webpage contains confidential information embedded in form labels, placeholders, or URL query parameters, that metadata is sent to Sarvam/OpenAI. |
| **User-Entered Form Input Values** (Pre-existing text inside page input boxes) | Read transiently by `detector.ts` from the DOM. | Transient DOM memory | `detector.ts` | **Filtered out.** `detector.ts` does not transmit pre-filled input values to the AI provider. | Malicious page scripts can observe what the user inputs or what FormPilot fills into the DOM. |
| **Autofilled Values** (Values populated into the webpage inputs) | Injected into the active tab's DOM input elements upon user confirmation. | Plaintext inside page DOM | `autofill.ts`, target webpage scripts | Injected into the DOM of the active tab. Webpage scripts receive standard DOM input/change events. | The host webpage and any third-party scripts/trackers embedded on that page have full visibility of the filled fields once injected. |

---

## 2. In-Depth Boundary Analysis

### Boundary 1: Webpage DOM ⟷ Extension Content Scripts
* **Isolation**: Content scripts run in an "isolated world" sharing the DOM with the host page, but with isolated JavaScript globals and scopes.
* **Red-Team Threat**: Host page scripts can mutate DOM elements, inject invisible fields, or attach mutation observers to steal values the moment they are autofilled.
* **Defensive Controls**:
  - `executeAutofill` strictly verifies `element.isConnected` (attached to DOM) and `isElementVisible` (not hidden via CSS display/visibility/opacity).
  - Dangerous form actions (`javascript:`, `data:`) trigger hard autofill rejection.
  - Password, OTP (`autocomplete="one-time-code"`), and credit card CVV (`autocomplete="cc-csc"`) fields are permanently blocked from autofill.

### Boundary 2: Content Scripts ⟷ Extension Extension Context (Popup / Dashboard)
* **Isolation**: Content scripts do not possess direct access to `chrome.storage.local` where vault data or API keys reside.
* **Red-Team Threat**: Spoofed cross-tab runtime messages to hijack popup state.
* **Defensive Controls**:
  - `Popup.tsx` validates `sender.tab.id === activeTabId` before accepting any `FORM_UPDATE` messages.
  - Form extraction and autofill execution are initiated solely by privileged `chrome.scripting.executeScript` from the user-triggered popup action, passing only user-approved operations.

### Boundary 3: Local Storage ⟷ Operating System Host
* **Isolation**: Chromium sandboxes `chrome.storage.local` to the extension's unique origin (`chrome-extension://<id>`).
* **Red-Team Threat**: Malware running under the user's OS user account or physical device theft.
* **Defensive Controls**:
  - Vault data is encrypted with AES-GCM-256 before writing to disk.
  - Session decryption keys are held in `chrome.storage.session` and memory, expiring automatically after 15 minutes of inactivity or browser restart.
* **Residual Limitation**: The Sarvam AI API key is stored unencrypted in `chrome.storage.local` (standard Chrome extension capability limitation). Local OS malware can read Chromium LevelDB files directly.

### Boundary 4: Extension ⟷ External Network Endpoints
* **Allowed Outbound Endpoints**:
  1. `https://api.sarvam.ai/v1/chat/completions` (Sarvam AI model inference)
  2. `https://api.openai.com/v1/chat/completions` and `https://api.openai.com/v1/models` (OpenAI model inference and key validation)
* **Strict Privacy Guarantees**:
  - No analytics, telemetry, crash reporting, or tracking servers exist in the codebase.
  - No external fonts, stylesheets, CDNs, or remote scripts are loaded (Manifest V3 CSP compliance).
  - Vault contents and personal records are **never** forwarded in the AI request payload. Only field labels, names, IDs, and form structural metadata are transmitted.
