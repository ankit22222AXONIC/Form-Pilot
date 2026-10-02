# Installation Guide

This guide explains how to install and set up the FormPilot extension in Google Chrome.

## 1. Get the Release Package

If you have downloaded the pre-packaged release (`FormPilot-Chrome-Extension.zip`), extract it to a folder on your computer.

If you are building from source:
1. Open a terminal in the project directory.
2. Run `npm install`
3. Run `npm run build`
4. Use the generated `dist/` folder for the steps below.

## 2. Load the Extension in Chrome

Since this extension is not published on the Chrome Web Store, you will need to load it manually in "Developer Mode".

1. Open Google Chrome.
2. In the URL bar, type `chrome://extensions/` and press Enter.
3. In the top right corner of the Extensions page, toggle **Developer mode** to **ON**.
4. Click the **Load unpacked** button that appears in the top left.
5. In the file browser, select the extracted release folder (or the `dist/` folder if you built it yourself).
6. FormPilot should now appear in your list of extensions!

> **Tip:** Click the puzzle piece icon next to your Chrome address bar and click the "Pin" icon next to FormPilot to keep it easily accessible.

## 3. First-Time Setup

Before you can use FormPilot to fill forms, you need to set up your encrypted vault and connect an AI provider.

### A. Create Your Vault
1. Click the FormPilot icon in your Chrome toolbar.
2. Click the **My Data** or **Settings** button in the popup to open the Dashboard.
3. You will be prompted to create a Master Password. **Do not forget this password!** FormPilot cannot recover it for you.
4. Once your vault is created, click **Add Record** in the "My Data" tab to add your Personal Details, Address, etc.

### B. Configure AI
FormPilot uses AI to understand what web forms are asking for.
1. In the Dashboard, click on the **Settings** tab.
2. Under "AI Configuration", select your preferred AI Provider (e.g., OpenAI).
3. Enter your valid API Key for that provider.
4. Click **Save Settings**. 

*(Note: Your API Key is stored locally in your browser storage. It is not shared with us.)*

## 4. How to Use FormPilot

1. Navigate to a webpage that contains a form you want to fill.
2. Click the FormPilot extension icon.
3. Click **Analyze Current Form**. The extension will scan the structure of the page and ask the AI what the fields mean.
4. If your vault is locked, you will be prompted to open the Dashboard and unlock it.
5. Review the "Matched Data". FormPilot will suggest which of your saved details belong in which fields.
6. Check or uncheck the fields you want to fill. FormPilot will warn you if it's about to overwrite something you already typed.
7. Click **Fill Selected Fields**.
8. **Always review the form yourself** and manually check any checkboxes or consent agreements.
9. Submit the form manually when you are ready. FormPilot will never click submit for you.
