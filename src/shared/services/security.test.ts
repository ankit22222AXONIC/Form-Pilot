import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cryptoService } from './crypto';
import { aiService } from './ai';
import { matchingService } from './matching';
import { authService } from './auth';

// Mock browser APIs
const mockLocalStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockLocalStorage[key] || null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
  removeItem: (key: string) => { delete mockLocalStorage[key]; },
  clear: () => { Object.keys(mockLocalStorage).forEach(k => delete mockLocalStorage[k]); },
  length: 0,
  key: () => null,
} as any;

import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
} else if (!globalThis.crypto.subtle) {
  (globalThis as any).crypto.subtle = webcrypto.subtle;
}

describe('Cryptographic Security', () => {
  it('uses unique IV for each encryption', async () => {
    const salt = cryptoService.generateSalt();
    const key = await cryptoService.deriveKey('testpass', salt);
    
    const enc1 = await cryptoService.encryptData({ test: 'data' }, key);
    const enc2 = await cryptoService.encryptData({ test: 'data' }, key);
    
    // Same plaintext must produce different IVs and ciphertexts
    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });

  it('uses unique salt for each generateSalt call', () => {
    const salt1 = cryptoService.generateSalt();
    const salt2 = cryptoService.generateSalt();
    expect(salt1).not.toBe(salt2);
  });

  it('derives different keys from different passwords', async () => {
    const salt = cryptoService.generateSalt();
    const key1 = await cryptoService.deriveKey('password1', salt);
    const key2 = await cryptoService.deriveKey('password2', salt);
    
    const exported1 = await cryptoService.exportKey(key1);
    const exported2 = await cryptoService.exportKey(key2);
    
    expect(exported1).not.toBe(exported2);
  });

  it('decryption fails with wrong key', async () => {
    const salt = cryptoService.generateSalt();
    const correctKey = await cryptoService.deriveKey('correct', salt);
    const wrongKey = await cryptoService.deriveKey('wrong', salt);
    
    const encrypted = await cryptoService.encryptData({ secret: 'data' }, correctKey);
    
    await expect(
      cryptoService.decryptData(encrypted, wrongKey)
    ).rejects.toThrow('Decryption failed');
  });

  it('decryption fails with tampered ciphertext', async () => {
    const salt = cryptoService.generateSalt();
    const key = await cryptoService.deriveKey('testpass', salt);
    
    const encrypted = await cryptoService.encryptData({ secret: 'data' }, key);
    
    // Tamper with ciphertext
    const tampered = { ...encrypted, ciphertext: encrypted.ciphertext.slice(0, -4) + 'AAAA' };
    
    await expect(
      cryptoService.decryptData(tampered, key)
    ).rejects.toThrow('Decryption failed');
  });

  it('decryption fails with tampered IV', async () => {
    const salt = cryptoService.generateSalt();
    const key = await cryptoService.deriveKey('testpass', salt);
    
    const encrypted = await cryptoService.encryptData({ secret: 'data' }, key);
    
    // Tamper with IV
    const tampered = { ...encrypted, iv: encrypted.iv.slice(0, -2) + 'AA' };
    
    await expect(
      cryptoService.decryptData(tampered, key)
    ).rejects.toThrow('Decryption failed');
  });

  it('roundtrips complex data correctly', async () => {
    const salt = cryptoService.generateSalt();
    const key = await cryptoService.deriveKey('testpass', salt);
    
    const complexData = {
      personalDetails: { fullName: 'Test User', dateOfBirth: '1990-01-01' },
      contactInfo: { email: 'test@example.com', phone: '+1234567890' },
      education: [{ id: '1', institutionName: 'MIT', qualification: 'BS' }],
      specialChars: 'Unicode: 日本語 • Emoji: 🔒 • HTML: <script>alert(1)</script>',
    };
    
    const encrypted = await cryptoService.encryptData(complexData, key);
    const decrypted = await cryptoService.decryptData(encrypted, key);
    
    expect(decrypted).toEqual(complexData);
  });

  it('key export/import roundtrip preserves functionality', async () => {
    const salt = cryptoService.generateSalt();
    const originalKey = await cryptoService.deriveKey('testpass', salt);
    
    // Encrypt with original
    const encrypted = await cryptoService.encryptData({ test: 'value' }, originalKey);
    
    // Export and reimport
    const exported = await cryptoService.exportKey(originalKey);
    const reimported = await cryptoService.importKey(exported);
    
    // Decrypt with reimported
    const decrypted = await cryptoService.decryptData(encrypted, reimported);
    expect(decrypted).toEqual({ test: 'value' });
  });
});

describe('AI Service Security', () => {
  beforeEach(() => {
    localStorage.clear();
    globalThis.fetch = vi.fn();
  });

  it('does NOT send field values to AI provider', async () => {
    await aiService.saveConfig({ provider: 'openai', apiKey: 'test-key', model: 'gpt-4o-mini' });
    
    const mockResponse = {
      formTitle: 'Test',
      summary: 'Test',
      fields: [],
      warnings: [],
      missingInformation: []
    };

    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      })
    });

    const detectionWithValues = {
      forms: [{
        id: 'f1',
        name: 'Form 1',
        fields: [{
          id: 'ssn',
          label: 'Social Security Number',
          type: 'text',
          required: true,
          disabled: false,
          value: '123-45-6789'  // This MUST NOT be sent
        }]
      }],
      totalFields: 1
    };

    await aiService.analyzeForm(detectionWithValues);

    const callArgs = (globalThis.fetch as any).mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    const userContent = body.messages[1].content;
    
    expect(userContent).not.toContain('123-45-6789');
    expect(userContent).not.toContain('value');
  });

  it('does NOT include API key in the AI prompt body', async () => {
    await aiService.saveConfig({ provider: 'openai', apiKey: 'sk-secret-test-key-123', model: 'gpt-4o-mini' });

    const mockResponse = {
      formTitle: 'Test',
      summary: 'Test',
      fields: [],
      warnings: [],
      missingInformation: []
    };

    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      })
    });

    await aiService.analyzeForm({ forms: [], totalFields: 0 });

    const callArgs = (globalThis.fetch as any).mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    
    // API key should be in headers, NOT in the message body
    const bodyStr = JSON.stringify(body.messages);
    expect(bodyStr).not.toContain('sk-secret-test-key-123');
  });

  it('handles 401/403 errors without leaking key info', async () => {
    await aiService.saveConfig({ provider: 'sarvam', apiKey: 'test-key', model: 'sarvam-105b' });

    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    });

    await expect(
      aiService.analyzeForm({ forms: [{ id: 'f1', name: 'F', fields: [{ id: '1', label: 'x', type: 'text', required: false, disabled: false }] }], totalFields: 1 })
    ).rejects.toThrow('Invalid Sarvam API key.');
  });

  it('handles rate limiting gracefully', async () => {
    await aiService.saveConfig({ provider: 'openai', apiKey: 'test-key', model: 'gpt-4o-mini' });

    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests'
    });

    await expect(
      aiService.analyzeForm({ forms: [{ id: 'f1', name: 'F', fields: [{ id: '1', label: 'x', type: 'text', required: false, disabled: false }] }], totalFields: 1 })
    ).rejects.toThrow('rate limit');
  });

  it('rejects response with missing fieldId', () => {
    expect(() => (aiService as any)._validateResponse({
      formTitle: 'test',
      fields: [{ category: 'unknown', originalLabel: 'test' }]
    })).toThrow('Field missing fieldId');
  });

  it('rejects response with wrong confidence type', () => {
    expect(() => (aiService as any)._validateResponse({
      formTitle: 'test',
      fields: [{ fieldId: 'f1', category: 'unknown', originalLabel: 'test', confidence: 'high' }]
    })).toThrow('Field confidence must be a number');
  });

  it('rejects response with wrong ambiguous type', () => {
    expect(() => (aiService as any)._validateResponse({
      formTitle: 'test',
      fields: [{ fieldId: 'f1', category: 'unknown', originalLabel: 'test', ambiguous: 'yes' }]
    })).toThrow('Field ambiguous must be a boolean');
  });

  it('strips markdown code blocks from Sarvam response', async () => {
    await aiService.saveConfig({ provider: 'sarvam', apiKey: 'test-key', model: 'sarvam-105b' });

    const innerJson = {
      formTitle: 'Test',
      summary: 'Test',
      fields: [{ fieldId: 'f1', category: 'unknown', originalLabel: 'test', interpretedMeaning: 'test', expectedFormat: 'text', required: false, confidence: 0.9, ambiguous: false, explanation: '' }],
      warnings: [],
      missingInformation: []
    };

    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '```json\n' + JSON.stringify(innerJson) + '\n```' } }]
      })
    });

    const result = await aiService.analyzeForm({
      forms: [{ id: 'f1', name: 'F', fields: [{ id: '1', label: 'x', type: 'text', required: false, disabled: false }] }],
      totalFields: 1
    });

    expect(result.formTitle).toBe('Test');
  });

  it('handles empty Sarvam response', async () => {
    await aiService.saveConfig({ provider: 'sarvam', apiKey: 'test-key', model: 'sarvam-105b' });

    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: null } }]
      })
    });

    await expect(
      aiService.analyzeForm({
        forms: [{ id: 'f1', name: 'F', fields: [{ id: '1', label: 'x', type: 'text', required: false, disabled: false }] }],
        totalFields: 1
      })
    ).rejects.toThrow('Empty response from Sarvam AI');
  });

  it('filters out rogue field IDs from AI response not present in detected form', async () => {
    await aiService.saveConfig({ provider: 'openai', apiKey: 'test-key', model: 'gpt-4o-mini' });

    const mockResponse = {
      formTitle: 'Test',
      summary: 'Test',
      fields: [
        { fieldId: 'valid-id', category: 'personal_details', originalLabel: 'Name', interpretedMeaning: 'Name', expectedFormat: 'text', required: false, confidence: 0.9, ambiguous: false, explanation: '' },
        { fieldId: 'injected-rogue-id', category: 'personal_details', originalLabel: 'Hidden Attack', interpretedMeaning: 'Attack', expectedFormat: 'text', required: false, confidence: 0.9, ambiguous: false, explanation: '' }
      ],
      warnings: [],
      missingInformation: []
    };

    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      })
    });

    const result = await aiService.analyzeForm({
      forms: [{ id: 'f1', name: 'F', fields: [{ id: 'valid-id', label: 'Name', type: 'text', required: false, disabled: false }] }],
      totalFields: 1
    });

    expect(result.fields.length).toBe(1);
    expect(result.fields[0].fieldId).toBe('valid-id');
    expect(result.fields.some(f => f.fieldId === 'injected-rogue-id')).toBe(false);
  });

  it('removeConfig completely removes AI configuration from storage', async () => {
    await aiService.saveConfig({ provider: 'sarvam', apiKey: 'key-to-delete', model: 'sarvam-105b' });
    let config = await aiService.getConfig();
    expect(config.apiKey).toBe('key-to-delete');

    await aiService.removeConfig();
    config = await aiService.getConfig();
    expect(config.apiKey).toBe('');
  });
});

describe('Matching Service Security', () => {
  it('does not leak unrelated vault data to unrelated fields', async () => {
    const vaultData = {
      personalDetails: { fullName: 'John Secret', firstName: 'John', middleName: '', lastName: 'Secret', dateOfBirth: '1990-01-01' },
      contactInfo: { email: 'secret@example.com', phone: '555-0000' },
      addressInfo: null,
      education: [],
      documents: [],
      apiKeys: [{ id: '1', providerName: 'OpenAI', keyLabel: 'prod', keyValue: 'sk-actual-key' }]
    };

    const aiResponse = {
      formTitle: 'Test',
      summary: 'Test',
      warnings: [],
      missingInformation: [],
      fields: [{
        fieldId: 'random',
        originalLabel: 'Random Field',
        interpretedMeaning: 'Something random',
        category: 'other' as const,
        expectedFormat: 'text',
        required: false,
        confidence: 0.5,
        ambiguous: false,
        explanation: ''
      }]
    };

    const results = await matchingService.matchFields(aiResponse, vaultData);
    
    // Should not match vault data to an 'other' category field
    expect(results[0].suggestedValue).toBeNull();
    expect(results[0].status).toBe('MISSING');
    
    // Specifically, API keys must NEVER appear in match results
    const allValues = results.map(r => r.suggestedValue).filter(Boolean);
    expect(allValues).not.toContain('sk-actual-key');
  });
});

describe('Vault Authentication & Auto-Lock Security', () => {
  beforeEach(async () => {
    await authService.lockVault();
    authService.setAutoLockTimeout(15);
  });

  it('stores and retrieves session key within active timeout window', async () => {
    const salt = cryptoService.generateSalt();
    const key = await cryptoService.deriveKey('vault-password', salt);
    await authService.setSessionKey(key);

    const retrieved = await authService.getSessionKey();
    expect(retrieved).not.toBeNull();
  });

  it('auto-locks and clears session key when inactivity timeout is exceeded', async () => {
    const salt = cryptoService.generateSalt();
    const key = await cryptoService.deriveKey('vault-password', salt);
    await authService.setSessionKey(key);

    // Simulate 20 minutes of inactivity (timeout is 15 minutes)
    const twentyMinutesAgo = Date.now() - 20 * 60 * 1000;
    mockLocalStorage['formpilot_last_activity'] = twentyMinutesAgo.toString();

    // getSessionKey must detect expired timeout, lock vault, and return null
    const retrieved = await authService.getSessionKey();
    expect(retrieved).toBeNull();
  });

  it('lockVault clears session key and activity tracking', async () => {
    const salt = cryptoService.generateSalt();
    const key = await cryptoService.deriveKey('vault-password', salt);
    await authService.setSessionKey(key);
    expect(mockLocalStorage['formpilot_last_activity']).toBeDefined();

    await authService.lockVault();
    expect(mockLocalStorage['formpilot_last_activity']).toBeUndefined();

    const retrieved = await authService.getSessionKey();
    expect(retrieved).toBeNull();
  });
});
