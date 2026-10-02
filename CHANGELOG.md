# Changelog

All notable changes to the FormPilot Chrome Extension project are documented in this file.

## [0.1.0] - 2026-10-02

### Added
- **Website Trust & Fraud Risk Analysis Engine**:
  - Independent risk scoring evaluating domain structure, lookalike brand heuristics, punycode spoofing, raw IP hosts, unexpected redirects, and external/dangerous form action destinations.
  - Interactive safety badge and contextual risk breakdowns in popup UI.
  - Automatic blocking of autofill actions when website risk is evaluated as High Risk or Critical.
- **Sarvam AI Primary Provider Integration**:
  - Direct integration with `https://api.sarvam.ai/v1/chat/completions` using the `sarvam-105b` model.
  - Clean schema normalization, fallback handling, and support for alternative OpenAI endpoints.
- **Local Vault Storage & Encryption**:
  - AES-GCM-256 authenticated encryption using Web Crypto API.
  - PBKDF2 key derivation with 210,000 iterations (SHA-256) and unique 16-byte cryptographically secure salts.
  - Tamper-evident ciphertext verification with automatic rejection of corrupted or modified data.
- **Assisted Autofill & Human-in-the-Loop Review**:
  - Field-by-field review list with toggleable approval checkboxes.
  - Zero automatic form submission or unprompted filling.
- **Red-Team Defensive Hardening**:
  - Just-in-time DOM re-verification in `executeAutofill`: verifies `element.isConnected` and `isElementVisible` (guards against post-scan DOM swaps/hiding).
  - Enclosing form action validation: blocks autofill into forms targeting `javascript:` or `data:` URLs.
  - Dynamic CSS selector escaping via `CSS.escape(fieldId)` across all content scripts.
  - Cross-tab sender validation in popup message listeners.
  - Robust auto-lock session handling: `checkAutoLock()` checked before key retrieval or activity refresh.
  - Sensitive field exclusion: hard block on `type="password"`, `type="hidden"`, and autocomplete tokens (`current-password`, `new-password`, `one-time-code`, `cc-csc`).
  - "Remove Configuration" capability to completely wipe stored AI API keys from `chrome.storage.local`.
- **Automated Test Coverage**:
  - 72 passing automated tests across 7 test suites covering cryptography, matching, AI communication, website trust, DOM detection, and adversarial autofill scenarios.

### Security & Privacy Disclosures
- Detailed data flow and adversarial attack scenarios documented in `FORMPILOT_RED_TEAM_REPORT.md`, `FORMPILOT_DATA_LEAK_MAP.md`, and `FORMPILOT_ATTACK_SCENARIOS.md`.
