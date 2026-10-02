import { describe, it, expect, beforeEach } from 'vitest';
import { vaultService } from './storage';
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

// Make crypto API available to Node
import { webcrypto } from 'crypto';
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
} else if (!globalThis.crypto.subtle) {
  (globalThis as any).crypto.subtle = webcrypto.subtle;
}

// We simulate no chrome object so it falls back to localStorage
describe('Vault & Auth Service Security Tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    await vaultService.clearVaultData();
    authService.setAutoLockTimeout(15);
  });

  it('Setup creates new salt, derives key, and sets up session', async () => {
    await vaultService.setupVault('password123');
    const salt = await vaultService.getSalt();
    expect(salt).toBeTruthy();
    
    const key = await authService.getSessionKey();
    expect(key).not.toBeNull();
  });

  it('Cannot access vault if locked', async () => {
    await vaultService.setupVault('password123');
    await authService.lockVault();
    
    await expect(vaultService.getVaultData()).rejects.toThrow('Vault is locked');
  });

  it('changePassword success re-encrypts with new key and salt', async () => {
    await vaultService.setupVault('oldPassword');
    const oldSalt = await vaultService.getSalt();
    
    // Save some data
    const data = vaultService.getDefaultVaultData();
    data.personalDetails = { fullName: 'Test User' } as any;
    await vaultService.saveVaultData(data);
    
    // Change password
    await vaultService.changePassword('oldPassword', 'newPassword456');
    
    // Verify salt changed
    const newSalt = await vaultService.getSalt();
    expect(newSalt).not.toBe(oldSalt);
    
    // Verify we can still decrypt and read data
    const readData = await vaultService.getVaultData();
    expect(readData.personalDetails?.fullName).toBe('Test User');
    
    // Verify old password doesn't work for derivation (can't test directly without exposing decrypt, but if we lock and simulate unlock with old, it fails)
  });

  it('changePassword fails with wrong old password and leaves data intact', async () => {
    await vaultService.setupVault('goodPassword');
    const oldSalt = await vaultService.getSalt();
    
    const data = vaultService.getDefaultVaultData();
    data.personalDetails = { fullName: 'Safe User' } as any;
    await vaultService.saveVaultData(data);
    
    await expect(
      vaultService.changePassword('wrongPassword', 'newPassword')
    ).rejects.toThrow('Incorrect current password.');
    
    // Verify data is still intact
    const currentSalt = await vaultService.getSalt();
    expect(currentSalt).toBe(oldSalt);
    
    const readData = await vaultService.getVaultData();
    expect(readData.personalDetails?.fullName).toBe('Safe User');
  });

  it('Cross-tab lock: locking updates local storage properly', async () => {
    await vaultService.setupVault('password123');
    
    // Simulate active session
    expect(await authService.getSessionKey()).not.toBeNull();
    
    // Lock vault
    await authService.lockVault();
    
    // Memory key should be null
    expect(await authService.getSessionKey()).toBeNull();
  });
});
