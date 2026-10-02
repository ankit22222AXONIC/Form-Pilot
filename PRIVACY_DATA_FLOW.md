# FormPilot — Privacy & Sensitive Data Flow Architecture

**Document Version:** 1.0.0  
**Effective Date:** 2026-10-02  
**Target:** Personal Deployment & Security Audit  

---

## 1. Overview & Core Privacy Principles

FormPilot is architected under a **Strict Local-First Privacy Model**. The design enforces four cardinal privacy boundaries:

1. **Local Encryption at Rest**: All sensitive profile data resides in the user's browser in an authenticated encrypted vault (AES-GCM-256).
2. **Zero Plaintext Transmission of Personal Information**: Personal identity records, contact details, addresses, and passwords are never transmitted over the internet.
3. **Metadata-Only AI Analysis**: Only empty form structure metadata (field names, labels, control types) is sent to external AI providers (Sarvam AI / OpenAI) to understand what a form is asking for.
4. **Mandatory Human-in-the-Loop Approval**: FormPilot never automatically fills or submits any form. The user must explicitly inspect suggested matches and click "Fill Selected Fields".

---

## 2. Sensitive Data Classification & Flow Matrix

| Data Category | Examples | Where It Enters | Where It Is Stored | Encryption Status | Decrypted In Memory | Sent to AI (Sarvam)? | Logged / Telemetry |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Master Password** | User passphrase | Vault setup / unlock form | Never persisted anywhere | N/A (ephemeral) | Transiently in KDF buffer | **NO** | **NO** |
| **Personal Identity** | Full name, DOB, gender | Dashboard "My Data" | `chrome.storage.local` (`formpilot_vault_data`) | **AES-GCM-256 (PBKDF2 key)** | Only while vault is unlocked | **NO** | **NO** |
| **Contact Information** | Email, phone numbers | Dashboard "My Data" | `chrome.storage.local` (`formpilot_vault_data`) | **AES-GCM-256 (PBKDF2 key)** | Only while vault is unlocked | **NO** | **NO** |
| **Address Records** | Street, city, state, PIN | Dashboard "My Data" | `chrome.storage.local` (`formpilot_vault_data`) | **AES-GCM-256 (PBKDF2 key)** | Only while vault is unlocked | **NO** | **NO** |
| **Education Records** | Degree, university, year | Dashboard "My Data" | `chrome.storage.local` (`formpilot_vault_data`) | **AES-GCM-256 (PBKDF2 key)** | Only while vault is unlocked | **NO** | **NO** |
| **Document Metadata** | Document label, reference # | Dashboard "My Data" | `chrome.storage.local` (`formpilot_vault_data`) | **AES-GCM-256 (PBKDF2 key)** | Only while vault is unlocked | **NO** | **NO** |
| **Webpage Form Labels** | "Full Name", "City", `<select>` options | Active tab DOM during scan | In-memory during analysis session | Plaintext (public DOM metadata) | In memory | **YES (Structure only)** | **NO** |
| **Website Trust Signals**| Hostname, protocol, form action destination | Active tab during scan | In-memory during analysis session | Plaintext | In memory | **NO (Evaluated locally)** | **NO** |
| **Webpage Field Values** | Existing text typed by user | Active tab DOM | Read transiently for overwrite warning | Plaintext | In memory | **NO (Explicitly stripped)** | **NO** |
| **Password / OTP Fields** | Password inputs, 2FA codes | Active tab DOM | **Ignored at detector layer** | N/A | Never captured | **NO** | **NO** |
| **AI Provider API Key** | `api-subscription-key` / `sk-...` | Settings page | `chrome.storage.local` (`formpilot_ai_config`) | Plaintext in local extension storage | In memory | **Sent in HTTPS header only** | **NO** |

---

## 3. End-to-End Data Flow Map

```
[ User Vault Input ]
        │
        ▼
[ PBKDF2 Key Derivation (210,000 rounds) ] ──> AES-GCM Encryption
                                                     │
                                                     ▼
                                      [ chrome.storage.local ] (Ciphertext + IV + Salt)
                                                     │
               ┌─────────────────────────────────────┘ (Decrypted only in memory when unlocked)
               ▼
[ Active Tab DOM Scan ]
  │  (detector.ts)
  ├─ Password / OTP / CVV fields ──> [ EXCLUDED / IGNORED ]
  ├─ Field values ─────────────────> [ STRIPPED BEFORE AI ]
  │
  ▼
[ Sanitized Form Metadata ]
  │  (ai.ts: ID, label, type, required flag, options)
  ▼
[ HTTPS POST to Sarvam AI / OpenAI ]
  │  (api-subscription-key header)
  ▼
[ AI Classification Response ]
  │  (Validate response & discard any rogue/injected fieldIds)
  ▼
[ Local Matching Engine (matching.ts) ]
  │  (Matches AI categories against decrypted local vault in memory)
  ▼
[ User Review UI in Popup ]
  │  (User inspects matches, unchecks unwanted fields)
  ▼
[ executeAutofill() on Active Tab ]
  │  (Writes values to approved input controls only)
  └─> [ NEVER SUBMITS FORM ]
```

---

## 4. What Is Transmitted to Sarvam AI

When the user clicks "Analyze Form", the HTTP POST request to `https://api.sarvam.ai/v1/chat/completions` contains:

1. **HTTP Headers**:
   - `Content-Type: application/json`
   - `api-subscription-key: <user_configured_key>`
2. **Payload Body**:
   - `model`: Selected model (default: `sarvam-105b`)
   - `messages`:
     - System prompt defining field category ontology.
     - User message containing JSON array of detected form fields:
       ```json
       [
         {
           "id": "fname",
           "label": "First Name",
           "type": "text",
           "required": true,
           "disabled": false
         }
       ]
       ```

### What is GUARANTEED NEVER to be sent to Sarvam:
- Your name, address, phone number, email, or any vault content.
- Pre-filled form values (e.g. existing text typed in the page).
- Password inputs or fields with `autocomplete="current-password"`, `"new-password"`, `"one-time-code"`, or `"cc-csc"`.
- Your master encryption password or session encryption keys.
- Webpage session cookies, tokens, or URL query parameters.

---

## 5. Storage, Retention, and Lifecycle

1. **Vault Data Retention**:
   - Persists in `chrome.storage.local` in AES-GCM-256 ciphertext format until the user deletes it.
   - Deletion: Dashboard → Settings → "Clear Vault" permanently removes both `formpilot_vault_data` and `formpilot_vault_salt`.
2. **Session Key Retention**:
   - Stored in `chrome.storage.session` and in-memory variable `memorySessionKeyBase64`.
   - Never written to disk.
   - Auto-locks after configured timeout (default: 15 minutes) or on browser shutdown.
   - Immediate lock: Popup or Dashboard "Lock Now" immediately wipes session keys from memory and session storage.
3. **AI Provider Configuration**:
   - Stored in `chrome.storage.local` under `'formpilot_ai_config'`.
   - Removal: Dashboard → Settings → "Remove Key" button clears stored API key and config from local storage.

---

## 6. Residual Privacy Risks & User Responsibilities

1. **Shared OS Profiles**:
   - `chrome.storage.local` is protected by Chrome's sandbox from web pages and other extensions, but files in the Chrome User Profile on the host filesystem are unencrypted by the browser. Anyone with physical access to your operating system user account can read files in `AppData/Local/Google/Chrome/User Data`.
2. **AI Provider Data Policies**:
   - Sarvam AI and OpenAI process the form labels sent to them according to their respective API terms of service. Since your API key is attached to the request, the provider knows your IP address and account identity.
3. **Adversarial Webpages**:
   - Malicious pages could attempt deceptive labels (e.g., labeling a field "First Name" when the form action submits to a third-party server). Always verify the URL and nature of the website before submitting forms.
