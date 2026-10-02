# FormPilot

FormPilot is a privacy-conscious, AI-assisted Chrome browser extension (Manifest V3) designed to help users intelligently analyze, map, and fill complex web forms without sacrificing control over their personal data.

Unlike cloud-synced form fillers that upload user profiles to remote servers, FormPilot stores personal profile records in a **locally encrypted vault** on your device. When analyzing a webpage, FormPilot uses AI solely to interpret the *structure and meaning* of form fields—your personal vault data is never forwarded to the AI model or any external telemetry service.

---

## Project Status

> **Current Status**: **Suitable for Limited Personal Use with Documented Limitations**  
> FormPilot has undergone comprehensive application security audits and adversarial red-team penetration testing (72 automated security tests passing). It is an independent experimental project provided for personal and educational use. Please review the [Disclaimer](#disclaimer--use-at-your-own-risk) and [Security Limitations](#security-limitations) before using with real personal information.

---

## Capabilities & Feature Matrix

### Implemented & Verified Capabilities
- **On-Demand DOM Form Detection**: Scans active web forms dynamically when initiated by the user. Identifies input controls, dropdowns, textareas, and radio options while assigning isolated tracking markers.
- **AI-Assisted Field Understanding**: Uses large language models to interpret messy, ambiguous, or multi-lingual form field labels and placeholders.
- **Primary Sarvam AI Integration**: Native support for **Sarvam AI** (`sarvam-105b`) via `https://api.sarvam.ai/v1/chat/completions`, with optional fallback to OpenAI (`gpt-4o-mini`).
- **Local-Only Encrypted Vault**: Stores personal profile information (identity, contact details, addresses, education, career) locally on your device.
- **Client-Side Cryptography**: Authenticated encryption via **AES-GCM-256** with **PBKDF2** key derivation (210,000 iterations, SHA-256) using standard browser `crypto.subtle`.
- **In-Memory Session Locking**: Vault master keys are never written to disk unencrypted. Automatic session locking clears the key after 15 minutes of inactivity or upon browser exit.
- **Smart Data Matching**: Correlates AI-categorized form fields with corresponding local vault records client-side. Personal vault records are never sent in the AI request payload.
- **Human-in-the-Loop Review**: Suggested values are presented in an interactive review checklist inside the extension popup. Users must explicitly review, toggle, and approve individual fields before filling. **Zero automatic form submission.**
- **Website Trust & Fraud Risk Engine**: Automatically inspects the current website's URL structure, punycode lookalikes, raw IP hosts, suspicious brand subdomains, and external or dangerous form submission targets (`javascript:`, `data:`). Autofill is automatically blocked on High Risk / Phishing targets.
- **Red-Team Defensive Hardening**:
  - Content scripts validate that elements are attached to the live DOM (`isConnected`) and visible (`isElementVisible`) at the exact moment of autofill to defeat post-scan DOM swaps.
  - All DOM element queries use `CSS.escape(fieldId)` to prevent selector breakout.
  - Runtime message listeners enforce sender tab verification (`sender.tab.id === activeTabId`).
  - Sensitive authentication fields (`type="password"`, `type="hidden"`, and autocomplete tokens `current-password`, `new-password`, `one-time-code`, `cc-csc`) are strictly ignored and blocked.

### Planned / Not Yet Implemented
- Multi-profile switching (e.g. separate "Work" vs. "Personal" vault identities).
- Cross-device peer-to-peer encrypted sync.
- Direct integration with local open-source LLMs (e.g. WebLLM or local Ollama instances).
- Automated multi-page wizard navigation (intentionally excluded to maintain manual user supervision).

---

## Technology Stack

- **Platform**: Google Chrome Extension (Manifest V3)
- **Frontend Framework**: React 19 with TypeScript
- **Bundler & Build Tooling**: Vite with `@crxjs/vite-plugin`
- **Styling**: Tailwind CSS & Vanilla CSS design system
- **Cryptography**: Web Crypto API (`crypto.subtle` with native AES-GCM and PBKDF2)
- **Icons**: Lucide React
- **Testing & Quality**: Vitest, JSDOM, TypeScript Compiler (`tsc`), Oxlint

---

## Installation Guide (Chrome)

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- Google Chrome (or Chromium-based browser such as Brave, Edge, or Arc)

### Step-by-Step Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/ankit22222AXONIC/Form-Pilot.git
   cd Form-Pilot
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Build the production extension bundle**:
   ```bash
   npm run build
   ```
   *This compiles TypeScript, bundles React assets, and outputs the final extension files into the `dist/` directory.*

4. **Load the extension into Chrome**:
   1. Open Google Chrome and navigate to `chrome://extensions`.
   2. In the top-right corner, enable **Developer mode** toggle.
   3. Click the **Load unpacked** button in the top-left toolbar.
   4. In the file picker, select the `dist` folder located inside your cloned `FormPilot` project directory.
   5. FormPilot will appear in your installed extensions list. Pin it to your Chrome toolbar for easy access.

---

## Configuration

### Setting Up Your AI Provider Key
1. Click the FormPilot extension icon in your Chrome toolbar.
2. In the popup, click **Manage Vault & Settings** to open the full Dashboard.
3. In the left navigation menu, select **Settings**.
4. Under **AI Provider Configuration**:
   - **Provider**: Select **Sarvam AI** (Recommended) or **OpenAI**.
   - **API Key**: Enter your personal API key (e.g. from your Sarvam AI dashboard).
   - **Model**: Default model is `sarvam-105b` (or `gpt-4o-mini` for OpenAI).
5. Click **Save & Test Connection**. FormPilot will verify network reachability with the provider.

### Removing Your API Key
To delete your stored API key at any time, go to **Settings** and click **Remove Configuration**. The key will be wiped from `chrome.storage.local`.

---

## Privacy and Data Handling

| Data Asset | Resting Location | Encryption | Transmitted Externally? |
| :--- | :--- | :--- | :--- |
| **Personal Vault Profile** | Local `chrome.storage.local` | **AES-GCM-256** (PBKDF2 210,000 iterations) | **No.** Never transmitted to any cloud or AI provider. |
| **Master Password** | RAM only during derivation | Discarded immediately; never written to disk | **No.** |
| **Session Key** | In-memory RAM + `chrome.storage.session` | Cleared on 15m inactivity or browser close | **No.** |
| **AI Provider API Key** | `chrome.storage.local` | Plaintext in Chrome's sandboxed local storage | Sent solely in HTTPS header to provider endpoint. |
| **Webpage Form Metadata** | Transient RAM in popup/tab | Plaintext | **Yes.** Field labels, names, and structural IDs are sent to the configured AI provider. |
| **User Personal Values** | Active Tab DOM | Populated only upon explicit user approval | Injected into the target page DOM as normal form input. |

For detailed information flow diagrams and threat models, see [PRIVACY.md](./PRIVACY.md), [FORMPILOT_DATA_LEAK_MAP.md](./FORMPILOT_DATA_LEAK_MAP.md), and [FORMPILOT_RED_TEAM_REPORT.md](./FORMPILOT_RED_TEAM_REPORT.md).

---

## Security Limitations

No software can provide absolute, inviolable security. When using FormPilot, be aware of the following fundamental operational boundaries:

1. **Host Operating System Compromise**: Chrome extensions operate within the host operating system user account. If your computer is infected with malware, infostealers, or keyloggers, an attacker with filesystem access can read browser LevelDB files or record keystrokes.
2. **Master Passphrase Entropy**: Offline resistance against brute-force attacks depends directly on the strength of your chosen master password. Use a long passphrase (at least 16 characters or 4 random words).
3. **Webpage Script Visibility**: Once data is autofilled into an active webpage's input fields, all scripts running on that webpage (including third-party analytics and ad trackers) have full visibility of those values. Always check the **Website Trust & Fraud Risk** badge before filling fields.
4. **Third-Party AI Infrastructure**: When using Sarvam AI or OpenAI, form structure metadata (field labels and structural tags) is transmitted over HTTPS to the AI vendor. FormPilot cannot control how external AI providers handle request logs.

---

## Troubleshooting

- **"Cannot analyze browser internal pages"**:
  - Extensions cannot execute content scripts on internal Chrome pages (`chrome://`, `edge://`, or the Chrome Web Store). Test FormPilot on standard `https://` websites or local test pages.
- **"Vault Locked Error"**:
  - After 15 minutes of inactivity or when reopening Chrome, the session key expires. Open the dashboard or popup and enter your master password to unlock.
- **"Analysis returned no data" / "Field no longer exists"**:
  - Highly dynamic Single Page Applications (SPAs) may re-render or tear down DOM nodes. Re-open the popup and click "Analyze Form" to refresh the field mapping.
- **"API Connection Failed"**:
  - Check your internet connection.
  - Verify that your Sarvam AI or OpenAI API key has active quota and is typed correctly without trailing whitespace.
- **Build / Packaging Errors**:
  - Ensure you are using Node.js v18+. Run `npm run test` to verify your environment against the 72 unit tests.

---

## Development & Testing

```bash
# Run automated test suites (72 unit and adversarial security tests)
npm run test

# Type-check TypeScript codebase
npx tsc --noEmit

# Run Oxlint linter
npx oxlint

# Run development server with Hot Module Reloading
npm run dev
```

---

## Disclaimer — Use at Your Own Risk

FormPilot is an independent experimental software project provided for educational and personal-use purposes.
Use and download FormPilot at your own risk.
The software is provided "AS IS" and "AS AVAILABLE", without guarantees that it will be error-free, uninterrupted, secure, or suitable for any particular purpose, to the extent permitted by applicable law.
The developer does not guarantee that personal information, API keys, or other data will never be exposed, lost, intercepted, or compromised.
Users are responsible for evaluating the software, protecting their devices and credentials, and deciding what information to store or enter.
The developer disclaims liability for damages to the extent permitted by applicable law. Nothing in this disclaimer excludes rights or responsibilities that cannot legally be excluded.
Do not store highly sensitive credentials or use FormPilot for critical transactions.
By choosing to use FormPilot, you acknowledge that software and security risks exist.

---

## License

This project is licensed under the [MIT License](./LICENSE).
