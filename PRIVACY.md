# Privacy and Security Design

FormPilot was built from the ground up to handle personal information responsibly. This document explains how your data is protected, what permissions the extension uses, and the known limits of our security model.

## What FormPilot Stores Locally

All of your personal information (name, address, education, contact info) is stored **strictly locally** on your device using Chrome's native storage (`chrome.storage.local`). 

Before this data is saved to your hard drive, it is encrypted using the **Web Crypto API (AES-GCM 256-bit)**. 
- The encryption key is derived from the Master Password you create.
- Your Master Password and the derived encryption key are **never** saved to disk.
- When you close your browser, the encryption key is wiped from memory, and the vault is mathematically locked.

## What FormPilot Sends to the AI

To understand complex web forms, FormPilot must communicate with an external AI provider (like OpenAI) using the API Key you provide.

**FormPilot ONLY sends:**
- The structural HTML metadata of the form (e.g., `<input id="fname" label="First Name" />`).
- System prompts instructing the AI on how to interpret this metadata.

**FormPilot NEVER sends:**
- Your personal vault data. 
- The values you have already typed into the form.
- The URL or domain you are currently visiting.

The matching between the AI's interpretation and your personal data happens entirely locally on your machine.

## Extension Permissions Explained

FormPilot requests the minimum necessary permissions in its Manifest V3 configuration:

- **`activeTab`**: Allows the extension to read the structure of the *currently active tab only* when you explicitly click "Analyze Current Form". It cannot passively read pages in the background.
- **`scripting`**: Required to inject the safe autofill logic into the webpage to physically insert your approved text into the form fields.
- **`storage`**: Used to save your encrypted vault data, your settings, and your AI API key to your local browser profile.

## What FormPilot Does NOT Do

To ensure user safety, FormPilot has strict behavioral boundaries:
- **No Cloud Sync:** We do not have servers. We do not sync your data. We do not collect telemetry or usage analytics.
- **No Auto-Submit:** FormPilot will never trigger a form submission.
- **No Password Filling:** FormPilot explicitly ignores `type="password"` fields. It is not a password manager.
- **No Credit Cards:** FormPilot will ignore fields that look like credit card inputs or CVVs.
- **No Invisible Changes:** FormPilot refuses to fill hidden fields, and warns you before overwriting a field you have already typed in.
- **No Automatic Consents:** FormPilot will never check a "Terms of Service" or "Newsletter" checkbox for you.

## Known Security Limitations

While FormPilot protects your data at rest and attempts to fill forms safely, you should be aware of inherent risks in the browser ecosystem:

1. **Malicious Webpages (XSS):** If you use FormPilot to fill a form on a compromised or malicious website, that website's scripts can immediately read the data we insert into the fields. Always verify the legitimacy of the website before using FormPilot.
2. **Other Extensions:** Other Chrome extensions installed on your browser with broad permissions (like screen recorders or DOM scrapers) can read the information FormPilot populates into the form.
3. **Data Loss:** Because your data is encrypted with a password only you know, there is no password recovery feature. If you forget your Master Password, your vault data is permanently inaccessible and must be deleted to start over.
