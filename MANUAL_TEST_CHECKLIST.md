# FormPilot Manual Testing Checklist

This checklist details the steps for manually verifying FormPilot's functionality within a live Chrome browser.

## 1. Extension Loading
- [ ] Build the project using `npm run build`.
- [ ] Navigate to `chrome://extensions/` in Google Chrome.
- [ ] Enable "Developer mode" in the top right.
- [ ] Click "Load unpacked" and select the `dist` folder.
- [ ] Verify the extension loads without any manifest warnings or errors.

## 2. Vault and Security
- [ ] Open the FormPilot dashboard (click the extension icon -> click "My Data" or "Settings").
- [ ] Create a new vault password.
- [ ] Add dummy data (e.g., John Doe, fake address).
- [ ] Refresh the page and verify the vault remains unlocked (session memory persists).
- [ ] Close the browser and reopen. Verify the vault is **locked**.
- [ ] Unlock the vault with the correct password.
- [ ] Attempt to unlock with an incorrect password and verify failure.
- [ ] Use the "Lock Vault" button and verify access is immediately revoked.
- [ ] Test the "Change Password" functionality. Ensure old data remains accessible using the new password.

## 3. UI Navigation & Rendering
- [ ] Open the popup. Verify rendering is clean, minimal, and respects the white/neutral style.
- [ ] Verify navigation buttons to the dashboard work correctly.
- [ ] Ensure empty states (e.g., no active forms, locked vault) guide the user effectively.

## 4. Webpage & Form Detection
- [ ] Open `test-pages/comprehensive-form.html` in Chrome.
- [ ] Open the FormPilot popup and click "Analyze Current Form".
- [ ] Verify the popup accurately counts the total forms (1) and total fields (~15).
- [ ] Verify that navigating to another tab and opening the popup requires a new analysis.
- [ ] Test dynamically adding a field (click "Add Dynamic Custom Field" in the test page) and trigger analysis again. Verify the count updates.

## 5. AI Form Analyzer & Smart Data Matching
- [ ] **Requires setting up Gemini API Key in the Settings Dashboard first.**
- [ ] With the vault unlocked, analyze the comprehensive test page.
- [ ] Verify the "Matched Data" UI replaces the initial form counts.
- [ ] Verify that matched fields (e.g., First Name, Email) are presented with their suggested values based on the dummy vault data.
- [ ] Verify that fields with existing values (e.g., the "Pre-filled Field") are **not** auto-selected and display a warning about overwriting.
- [ ] Verify that unmapped fields (e.g., Institution Name if no education data exists) are correctly marked as MISSING.
- [ ] Verify that the user can toggle checkboxes to manually select/deselect fields for autofill.

## 6. Assisted Autofill
- [ ] Ensure the vault is unlocked and fields are matched in the popup.
- [ ] Select a few fields (e.g., First Name, Email).
- [ ] Click the "Fill X Selected Fields" button.
- [ ] Verify the test page's DOM elements successfully update with the approved values.
- [ ] Verify the popup displays a success result screen indicating which fields succeeded.
- [ ] Verify that attempting to fill disabled or readonly fields (e.g., "System ID", "Disabled Input") results in a failure logged in the result screen, and the DOM remains untouched.
- [ ] Verify that passwords and credit card inputs are excluded.

## 7. Error Handling
- [ ] Disable your internet connection and attempt analysis. Verify a clear network error is shown.
- [ ] Lock the vault, open the test page, and attempt analysis. Verify the UI alerts you that the vault is locked and prevents data matching.
- [ ] Switch to a restricted Chrome tab (e.g., `chrome://settings`) and attempt analysis. Verify a clear "Cannot analyze browser internal pages" error is displayed.
