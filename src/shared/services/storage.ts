import type { VaultData } from '../types';
import { cryptoService, type EncryptedVault } from './crypto';
import { authService } from './auth';

const VAULT_STORAGE_KEY = 'formpilot_vault_data';
const SALT_STORAGE_KEY = 'formpilot_vault_salt'; // Store salt separately for checking setup status

const isChromeStorageAvailable = () => typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

export const vaultService = {
  async isVaultSetup(): Promise<boolean> {
    if (isChromeStorageAvailable()) {
      return new Promise<boolean>((resolve) => {
        chrome.storage.local.get(SALT_STORAGE_KEY, (result) => {
          resolve(!!result[SALT_STORAGE_KEY]);
        });
      });
    } else {
      return !!localStorage.getItem(SALT_STORAGE_KEY);
    }
  },

  async getSalt(): Promise<string | null> {
    if (isChromeStorageAvailable()) {
      return new Promise<string | null>((resolve) => {
        chrome.storage.local.get(SALT_STORAGE_KEY, (result) => {
          resolve((result[SALT_STORAGE_KEY] as string) || null);
        });
      });
    } else {
      return localStorage.getItem(SALT_STORAGE_KEY);
    }
  },

  async setupVault(password: string): Promise<void> {
    const salt = cryptoService.generateSalt();
    const key = await cryptoService.deriveKey(password, salt);
    
    if (isChromeStorageAvailable()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ [SALT_STORAGE_KEY]: salt }, () => resolve());
      });
    } else {
      localStorage.setItem(SALT_STORAGE_KEY, salt);
    }

    await authService.setSessionKey(key);
    await this.saveVaultData(this.getDefaultVaultData());
  },

  async getVaultData(): Promise<VaultData> {
    const key = await authService.getSessionKey();
    if (!key) throw new Error('Vault is locked');

    let encryptedVault: EncryptedVault | null = null;
    if (isChromeStorageAvailable()) {
      encryptedVault = await new Promise<EncryptedVault | null>((resolve) => {
        chrome.storage.local.get(VAULT_STORAGE_KEY, (result) => {
          resolve((result[VAULT_STORAGE_KEY] as EncryptedVault) || null);
        });
      });
    } else {
      const data = localStorage.getItem(VAULT_STORAGE_KEY);
      if (data) encryptedVault = JSON.parse(data);
    }

    if (!encryptedVault) {
      return this.getDefaultVaultData();
    }

    try {
      return await cryptoService.decryptData(
        { ciphertext: encryptedVault.ciphertext, iv: encryptedVault.iv },
        key
      );
    } catch (_e) {
      throw new Error('Failed to decrypt vault data. Data might be corrupted or key is invalid.');
    }
  },

  async saveVaultData(data: VaultData): Promise<void> {
    const key = await authService.getSessionKey();
    if (!key) throw new Error('Vault is locked');

    const encrypted = await cryptoService.encryptData(data, key);
    const salt = await this.getSalt();

    if (!salt) throw new Error('Vault is not setup properly.');

    const vault: EncryptedVault = {
      version: 1,
      salt: salt,
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext
    };

    if (isChromeStorageAvailable()) {
      return new Promise<void>((resolve) => {
        chrome.storage.local.set({ [VAULT_STORAGE_KEY]: vault }, () => {
          resolve();
        });
      });
    } else {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
      return Promise.resolve();
    }
  },

  async clearVaultData(): Promise<void> {
    await authService.lockVault();
    if (isChromeStorageAvailable()) {
      return new Promise<void>((resolve) => {
        chrome.storage.local.remove([VAULT_STORAGE_KEY, SALT_STORAGE_KEY], () => {
          resolve();
        });
      });
    } else {
      localStorage.removeItem(VAULT_STORAGE_KEY);
      localStorage.removeItem(SALT_STORAGE_KEY);
      return Promise.resolve();
    }
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const currentSalt = await this.getSalt();
    if (!currentSalt) throw new Error('Vault is not setup properly.');

    // 1. Verify old password
    const oldKey = await cryptoService.deriveKey(oldPassword, currentSalt);
    let vaultData: VaultData;
    
    let encryptedVault: EncryptedVault | null = null;
    if (isChromeStorageAvailable()) {
      encryptedVault = await new Promise<EncryptedVault | null>((resolve) => {
        chrome.storage.local.get(VAULT_STORAGE_KEY, (result) => {
          resolve((result[VAULT_STORAGE_KEY] as EncryptedVault) || null);
        });
      });
    } else {
      const data = localStorage.getItem(VAULT_STORAGE_KEY);
      if (data) encryptedVault = JSON.parse(data);
    }

    if (!encryptedVault) {
      vaultData = this.getDefaultVaultData();
    } else {
      try {
        vaultData = await cryptoService.decryptData(
          { ciphertext: encryptedVault.ciphertext, iv: encryptedVault.iv },
          oldKey
        );
      } catch (_e) {
        throw new Error('Incorrect current password.');
      }
    }

    // 2. Generate new key and salt
    const newSalt = cryptoService.generateSalt();
    const newKey = await cryptoService.deriveKey(newPassword, newSalt);

    // 3. Encrypt data with new key
    const encrypted = await cryptoService.encryptData(vaultData, newKey);
    const newVault: EncryptedVault = {
      version: 1,
      salt: newSalt,
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext
    };

    // 4. Save new salt and vault atomically
    if (isChromeStorageAvailable()) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.set({ 
          [SALT_STORAGE_KEY]: newSalt,
          [VAULT_STORAGE_KEY]: newVault 
        }, () => resolve());
      });
    } else {
      localStorage.setItem(SALT_STORAGE_KEY, newSalt);
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(newVault));
    }

    // 5. Update session key
    await authService.setSessionKey(newKey);
  },

  getDefaultVaultData(): VaultData {
    return {
      personalDetails: null,
      contactInfo: null,
      addressInfo: null,
      education: [],
      documents: [],
      apiKeys: [],
    };
  }
};
