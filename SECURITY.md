# Security Policy

## Reporting Security Vulnerabilities

The security and privacy of user data are foundational to FormPilot. If you discover a security vulnerability, privacy leak, or architectural weakness in this repository, please report it responsibly.

### Reporting Channels
- Please **do not** open a public GitHub issue for sensitive security vulnerabilities.
- Submit a private vulnerability advisory through GitHub's [Advisory Reporting Feature](https://github.com/ankit22222AXONIC/Form-Pilot/security/advisories) or contact the project maintainer directly.

### What to Include in Your Report
To help us triage and resolve the issue quickly, please include:
1. **Description**: A clear description of the vulnerability and its potential impact.
2. **Reproduction Steps**: Step-by-step instructions or safe, synthetic proof-of-concept (PoC).
3. **Affected Components**: File paths, functions, or UI views involved.
4. **Environment**: Chrome version, operating system, and extension build version.

### Safe Research Guidelines
- Only test against your own local installations and synthetic test data.
- Do not attempt attacks against real users, external domains, or production AI API endpoints.
- Do not disclose or exfiltrate private credentials or real personal data.

### Known Architectural Boundaries & Limitations
Before filing, please review [FORMPILOT_RED_TEAM_REPORT.md](./FORMPILOT_RED_TEAM_REPORT.md) and [FORMPILOT_DATA_LEAK_MAP.md](./FORMPILOT_DATA_LEAK_MAP.md). In particular:
- **Operating System Malware**: As a client-side Chrome extension, FormPilot cannot defend against malicious software running under the user's OS user account that can inspect disk files or log keystrokes.
- **Third-Party AI Endpoint**: Form field structure (names, IDs, labels) is processed by Sarvam AI (`api.sarvam.ai`) or OpenAI when the user explicitly triggers AI analysis. Vault contents are never sent.
- **Client-Side Master Password**: Brute-force resilience relies on the entropy of the user's chosen master password.
