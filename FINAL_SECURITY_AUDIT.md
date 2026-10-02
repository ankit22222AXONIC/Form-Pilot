# FormPilot — Final Security & Privacy Hardening Audit Report

**Date:** 2026-10-02  
**Audit Scope:** Full codebase, Manifest V3, Web Crypto implementation, Sarvam AI / OpenAI pipelines, Content scripts, DOM attack surface, Dependencies & Build Artifacts, Website Trust & Fraud Risk Analysis Engine  
**Status:** READY FOR PERSONAL USE WITH DOCUMENTED LIMITATIONS  

---

## 1. Executive Summary

FormPilot has undergone a rigorous, multi-phase application security, browser extension security, privacy hardening, and website fraud risk evaluation audit. FormPilot is architected around a strict **local-first encrypted vault** design with human-in-the-loop verification before form filling.

### Key Highlights:
- **Total Tests Passing**: **67 / 67 tests** across 7 test suites (including 20 cryptographic and security tests, 15 website trust and fraud risk tests, 10 autofill isolation tests, and 5 detector isolation tests).
- **TypeScript & Linting**: Clean compilation (`tsc --noEmit` exited `0`), 0 linter errors (`oxlint` clean).
- **Zero Auto-Submit**: Verified that the extension contains no code path capable of triggering form submission.
- **Strict Data Sanitization**: Confirmed that personal vault data and pre-filled form values are never transmitted to AI endpoints (Sarvam or OpenAI).
- **Website Trust & Fraud Risk Engine**: Automatically inspects domain, connection security, brand lookalikes, Punycode/IDN, excessive subdomains, and form submission destinations, with an autofill barrier on high-risk sites.
- **Hardening Enhancements Implemented**:
  1. Complete exclusion of password and OTP fields at the detection layer.
  2. Strict validation and discarding of rogue or injected field IDs returned by AI models.
  3. Strict input element type enforcement in autofill (blocks non-form controls).
  4. Blocked autofill on sensitive authentication and payment attributes (`one-time-code`, `cc-csc`).
  5. Added explicit API key removal control in settings (`removeConfig`).
  6. Sanitized cryptographic error handling to prevent stack trace dumping to the browser console.
  7. Deterministic local heuristics for website trust with four distinct statuses (never using a deceptive "Safe" badge).

---

## 2. Actual Security Findings & Hardening Remediations

| Finding ID | Severity | Category | File | Description & Vulnerability | Remediation Applied |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | High | Injection | `autofill.ts` | CSS selector injection vulnerability via unescaped `fieldId` in `querySelector`. | Applied `CSS.escape(op.fieldId)` and scoped lookups. |
| **SEC-02** | High | Injection | `detector.ts` | CSS selector injection in label lookup `label[for="..."]`. | Applied `CSS.escape(field.id)`. |
| **SEC-03** | Medium | Privacy Leak | `detector.ts` | Password and OTP fields were captured during scanning, exposing metadata to AI. | Explicitly ignored `type="password"` and autocomplete attributes `current-password`, `new-password`, `one-time-code`, `cc-csc`. |
| **SEC-04** | Medium | Malicious AI / DOM | `ai.ts` | AI could return invented or hallucinated `fieldId`s (prompt injection or model drift). | Added strict `validFieldIds` filtering; any field ID not in detected form is stripped. |
| **SEC-05** | Medium | DOM Safety | `autofill.ts` | Fallback selector could target non-input DOM elements (`div`, `button`, etc.). | Added strict tag validation (`input`, `select`, `textarea`); blocks sensitive autocomplete (`one-time-code`, `cc-csc`). |
| **SEC-06** | Medium | Credential Lifecycle | `Settings.tsx` & `ai.ts` | No dedicated mechanism to completely delete stored AI API key. | Added `removeConfig()` and user-facing "Remove Key" button in Settings. |
| **SEC-07** | Low | Info Disclosure | `storage.ts` | Decrypt failure logged raw error object `e` to console. | Sanitized catch block; removed `console.error` dumping error traces. |
| **SEC-08** | Low | False Claim | `Overview.tsx` | Claimed AI processing was "anonymous". | Corrected to state accurately that vault data remains local, while metadata is sent via user's API key. |
| **SEC-09** | Low | Reliability | `ai.ts` | AI fetch requests lacked default abort timeout. | Enforced 60-second default `AbortController` timeout. |
| **SEC-10** | Low | Code Quality | Multiple | Unnecessary regex escapes and unhandled catch parameters. | Resolved all linter errors. |
| **SEC-11** | High | Fraud / Phishing | `trust.ts` & `Popup.tsx` | Users previously had no visibility into domain lookalikes, cross-domain form exfiltration, or fraud risk. | Implemented Website Trust & Fraud Risk Engine with high-risk autofill blocking. |

---

## 3. Website Trust & Fraud Risk Analysis Engine

### Assessment Statuses Enforced:
1. **No obvious warning signs detected** (Never presented as a green "Safe" badge; clearly disclaimed as preliminary heuristic analysis).
2. **Caution — suspicious indicators found** (Triggered by unencrypted HTTP, cross-domain form destinations, or deep subdomain chains).
3. **High risk — strong indicators of possible fraud** (Triggered by IP hostnames, Punycode/IDN homographs, brand typosquatting, title brand mismatches, or mixed-content/scripted form actions).
4. **Unable to verify — insufficient evidence** (Triggered on internal pages, empty URLs, or malformed addresses).

### Detection Methods Implemented:
- **Connection Security**: Validates HTTPS. Explains that HTTPS encrypts connection in transit but does not prove organizational legitimacy.
- **IP Hostname Detection**: Identifies numeric IPv4 and IPv6 hostnames used to bypass domain reputation.
- **Punycode / Homograph Detection**: Flags `xn--` encoding and non-ASCII character substitutions in hostnames.
- **Brand Impersonation & Typosquatting**: Checks for brand names and common leetspeak substitutions (`paypa1`, `g00gle`, `amaz0n`, `app1e`, etc.) on unauthorized domains.
- **Identity Mismatch**: Compares `document.title` brand claims against the verified domain name.
- **Form Action Destination Verification**: Compares form `action` URLs with page apex domains; flags third-party exfiltration destinations, mixed-content HTTP submissions from HTTPS, and `javascript:`/`data:` form actions.
- **Reputation Service Interface**: Provides extensible `ReputationProvider` architecture for future external reputation lookups with local heuristic fallback.

### Autofill Safety Integration:
- On `HIGH_RISK` websites, autofill is **hard-locked**.
- The "Fill Selected Fields" button is disabled until the user explicitly checks the fraud acknowledgment checkbox:
  *"I understand the fraud risk and explicitly want to proceed with autofill."*
- Form submission is **never** automated.

---

## 4. Cryptographic & Vault Security Assessment

- **Encryption Algorithm**: AES-GCM with 256-bit key length.
- **Key Derivation Function (KDF)**: PBKDF2 using SHA-256 with **210,000 iterations** (compliant with current OWASP password storage recommendations).
- **Salt & IV Generation**:
  - Salt: 16 cryptographically random bytes via `crypto.getRandomValues`.
  - IV: Unique 12 cryptographically random bytes generated per encryption operation.
- **Integrity Verification**: AES-GCM provides authenticated encryption with an embedded 128-bit authentication tag. Any tampering with ciphertext or IV causes `crypto.subtle.decrypt` to reject immediately.
- **Session Key Lifecycle**:
  - Session key is held in memory and backed by `chrome.storage.session` (in-memory storage wiped on browser exit).
  - Auto-locks on configurable timeout (default 15 minutes) or immediate manual lock.
  - Locking immediately clears memory reference (`memorySessionKeyBase64 = null`) and removes session storage entry.

---

## 5. API Key & External AI Provider Security

- **Storage**: Stored in `chrome.storage.local` under `'formpilot_ai_config'`.
- **Transmission**: Sent via HTTPS in request header (`api-subscription-key` for Sarvam, `Authorization: Bearer` for OpenAI). Never included in request payload body or prompt text.
- **Isolation**: Cannot be read by web pages or other extensions due to Chrome origin sandboxing.
- **Residual Limitation**: The API key is stored in plaintext within Chrome's local storage database files on your computer. If an attacker gains physical or remote code access to your OS user account, the API key can be recovered from the Chrome user profile directory.

---

## 6. Chrome Manifest V3 Permissions Assessment

The extension declares only 3 permissions in `manifest.json`:
1. `activeTab`: Grants temporary host permission to the currently active tab **only when the user clicks the extension action icon**. It does not allow background monitoring across arbitrary tabs.
2. `storage`: Required for storing the encrypted vault ciphertext and extension configuration.
3. `scripting`: Required to inject the form detector and autofill functions into the active tab on demand.

**No Broad Host Permissions**: The extension does not declare `<all_urls>` or wildcard domain permissions. It has no background persistent service worker and exposes no `web_accessible_resources`.

---

## 7. Dependency & Supply-Chain Audit

- **Audit Tool**: `npm audit`
- **Finding**: High severity advisory in devDependency `rollup < 2.80.0` inside `@crxjs/vite-plugin`.
- **Assessment**: `@crxjs/vite-plugin` and `rollup` are build-time development tools used exclusively during bundle creation on the developer's workstation. Neither `rollup` nor `@crxjs/vite-plugin` is included in the runtime extension code installed into Chrome. The bundled extension has only runtime dependencies on React 19 and Lucide icons.

---

## 8. Verification Evidence & Test Execution

```
Test Files: 7 passed (7)
Tests:      67 passed (67)
Duration:   ~6.99s
Typecheck:  tsc --noEmit -> 0 errors (clean)
Linter:     oxlint -> 0 errors, 13 benign warnings
Vite Build: Built in 3.39s -> dist/ verified complete
```

### Test Suite Breakdown:
- `trust.test.ts`: **15 passed** (Legitimate HTTPS, HTTP, IP hostname, Punycode, brand lookalikes, false-positive protection, cross-domain actions, mixed-content actions, script actions, subdomain depth, invalid URLs, reputation provider integration, provider timeouts, prompt injection safety)
- `security.test.ts`: **20 passed** (Crypto IV uniqueness, error sanitization, rogue field filtering, key removal, tamper rejection)
- `autofill.test.ts`: **10 passed** (Control type validation, sensitive attribute blocking, no auto-submit, SPA fallback)
- `ai.test.ts`: **8 passed** (Metadata sanitization, prompt safety, Sarvam headers)
- `vault.test.ts`: **5 passed** (Vault setup, encryption, password change, cross-tab lock)
- `detector.test.ts`: **5 passed** (Form detection, password/OTP exclusion, floating fields, value extraction)
- `matching.test.ts`: **4 passed** (Semantic category matching, ambiguity detection, format incompatibility)

---

## 9. Manual Verification Steps for Live Chrome Testing

To load and test the extension in Google Chrome:

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top right corner.
3. Click **Load unpacked** and select the folder:
   `c:\Users\ANKIT KUMAR\Desktop\FormPilot\dist`
4. Click the FormPilot icon in the toolbar:
   - Create your master vault password.
   - Enter your personal profile data in the Dashboard (`My Data`).
   - Configure your Sarvam AI API subscription key in Settings.
5. Test Website Trust:
   - Open any standard HTTPS website or local test page.
   - Click "Analyze Form".
   - Notice the **Website Trust Check** section showing domain, status, findings, and recommendation.
   - On a test page with an external form action or unencrypted HTTP, confirm status changes to "Caution" or "High Risk".
   - On High Risk findings, verify that autofill is locked until the acknowledgment checkbox is checked.

---

## 10. Explicit Conditions Under Which FormPilot Should NOT Be Used

Do **NOT** use FormPilot with real personal data if:
1. **The host machine is shared or untrusted**: Anyone with access to your unlocked Windows account can inspect Chrome's local storage directory and extract the plaintext AI API key.
2. **You are filling untrusted / phishing websites**: While FormPilot alerts you to suspicious domain and form action indicators, if you manually override the warning or submit data on a phishing site, your data will be captured by that website upon manual submission.
3. **You require zero external network calls**: AI field understanding requires sending form labels to Sarvam or OpenAI. If your threat model prohibits any external network requests, do not configure an AI key.
