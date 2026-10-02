# FormPilot Testing Guide

This document outlines the testing strategy, test coverage, and instructions for running the automated tests for FormPilot.

## Testing Strategy

FormPilot employs a testing strategy focused on validating the isolated logic of the extension, since full end-to-end browser extension testing requires complex environment setups. 

The strategy relies heavily on **Vitest** with **jsdom** to simulate DOM environments and test content scripts and shared services.

## Automated Test Coverage

The following core modules have automated test suites covering their logic:

1. **AI Service (`src/shared/services/ai.test.ts`)**
   - Validates proper formatting of the system prompt and structured JSON requests.
   - Tests fallback behavior when the AI response is malformed or invalid JSON.
   - Ensures error handling when the network is unavailable or the API key is missing.

2. **Matching Service (`src/shared/services/matching.test.ts`)**
   - Validates semantic matching logic (mapping AI field classification to the internal Personal Data Vault schema).
   - Ensures formatting requirements (e.g., date formats, state abbreviations) are handled appropriately.
   - Verifies that ambiguous or unknown fields are properly flagged for manual review (`requiresReview = true`).

3. **Vault & Storage Service (`src/shared/services/vault.test.ts`)**
   - End-to-end test of the encryption and decryption pipeline using Web Crypto API.
   - Verifies session management (login, logout, session expiration).
   - Tests CRUD operations on the vault data and ensures data is only stored in encrypted format.
   - Validates that changing passwords re-encrypts the vault data properly without data loss.

4. **Autofill Script (`src/content/autofill.test.ts`)**
   - Tests safe DOM manipulation by asserting values are correctly filled via React-compatible setters.
   - Verifies that disabled, readonly, hidden, and password fields are strictly rejected.
   - Verifies that unsupported elements (like checkboxes) are rejected for autofill.
   - Simulates DOM nodes disappearing to verify the script handles race conditions safely.

5. **Form Detector (`src/content/detector.test.ts`)**
   - Simulates DOM parsing using `jsdom`.
   - Verifies fields inside and outside `<form>` tags are properly extracted.
   - Verifies extraction of the element's existing `value` (to prevent silent overwrites).
   - Ensures `data-fp-id` attributes are reliably injected to tie elements between the background script and popup.

## How to Run Automated Tests

The project is configured to run all test suites using `vitest`.

### Prerequisites
Make sure dependencies are installed:
```bash
npm install
```

### Running Tests
To run all tests once:
```bash
npm run test
# or
npx vitest run
```

To run tests in watch mode (useful during active development):
```bash
npx vitest
```

### Type Checking & Build Verification
To ensure all types are valid and the project builds successfully into a Chrome Extension:
```bash
npm run typecheck && npm run build
```

## Continuous Integration
Any CI pipeline should execute the following sequence to guarantee reliability:
1. `npm install`
2. `npm run typecheck`
3. `npm run test` (or `npx vitest run`)
4. `npm run build`
