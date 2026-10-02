# FormPilot Security Review

This document outlines the verified security protections, existing limitations, and unresolved risks related to FormPilot's architecture and privacy-first design.

## Verified Protections

### 1. Zero Cloud Synchronization (Local-First)
- **Status:** Verified.
- **Evidence:** `vaultService` explicitly uses `chrome.storage.local` to persist the encrypted database. There are no API calls to custom backends or sync services, except for the explicit AI provider configured by the user.

### 2. Encryption at Rest
- **Status:** Verified.
- **Evidence:** The vault uses `AES-GCM` encryption via the native `Web Crypto API`. Data is never stored in plain text. A cryptographically strong `PBKDF2` key derivation function is used with a random salt to generate the 256-bit AES key. The salt and initialization vector (IV) are generated freshly.

### 3. Session-Bound Decryption & Auto-locking
- **Status:** Verified.
- **Evidence:** The derived encryption key is stored in memory (`authService.ts`) and is intentionally ephemeral. Once the extension background service worker goes dormant or the browser is closed, the key is wiped from memory, forcing a manual unlock.

### 4. Content Script Isolation
- **Status:** Verified.
- **Evidence:** Vault data is strictly retrieved and decrypted in the extension's popup context. The content scripts (`detector.ts`, `autofill.ts`) only send DOM metadata *out* and receive approved insertion strings *in*. They do not have access to the master vault, and webpage JS cannot request vault data from them.

### 5. Autofill Safety Rails
- **Status:** Verified.
- **Evidence:** Automated tests (`autofill.test.ts`) guarantee that the content script refuses to alter:
  - `password` inputs.
  - `hidden` inputs.
  - `disabled` elements.
  - `readonly` elements.
  - `checkbox` elements (to prevent accidental consent).

### 6. Silent Overwrite Prevention
- **Status:** Verified.
- **Evidence:** `Popup.tsx` intercepts fields that already contain a `value` and explicitly blocks auto-selection, forcing the user to manually review and approve an overwrite operation.

## Limitations & Unresolved Risks

### 1. Cross-Site Scripting (XSS) in Target Pages
- **Risk:** If a malicious webpage executes XSS, it could potentially listen to DOM events or observe the injected values immediately after FormPilot inserts them.
- **Mitigation:** FormPilot relies on the user to visually verify the webpage is legitimate before triggering an analysis or fill operation. Values are only inserted upon explicit user command, preventing background scraping.

### 2. Third-Party AI Data Processing
- **Risk:** FormPilot relies on an external AI service (e.g., Google Gemini) to classify field types.
- **Mitigation:** Only the structural DOM metadata (field labels, IDs, types) are sent to the AI service. Personal Vault Data is **never** sent to the AI API; the matching between the AI's structural classification and the user's personal data happens entirely locally in `matchingService.ts`.

### 3. Screen Readers & Extensions
- **Risk:** Other extensions installed on the user's browser with overlapping permissions (e.g., screen recorders, DOM scrapers) can read the information populated into the form.
- **Mitigation:** Inherent risk of browser environments. No specific mitigation applied as it falls outside extension isolation boundaries.

### 4. Limited Password Recovery
- **Risk:** Since encryption is purely local and mathematically bound to the master password, a forgotten password results in total data loss.
- **Mitigation:** Standard consequence of zero-knowledge architectures. The application could benefit from a recovery seed phrase in future phases if deemed necessary, but currently operates strictly on a "know-it-or-lose-it" model.
