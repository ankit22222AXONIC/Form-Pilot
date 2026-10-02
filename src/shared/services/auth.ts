import { cryptoService } from './crypto';

const SESSION_KEY_NAME = 'formpilot_session_key';
const isChromeStorageSessionAvailable = () => typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session;

let memorySessionKeyBase64: string | null = null;
let autoLockTimeoutMinutes = 15;

export const authService = {
  async getSessionKey(): Promise<CryptoKey | null> {
    if (this.checkAutoLock()) {
      return null;
    }
    let keyBase64 = memorySessionKeyBase64;

    if (!keyBase64 && isChromeStorageSessionAvailable()) {
      keyBase64 = await new Promise<string | null>((resolve) => {
        chrome.storage.session.get(SESSION_KEY_NAME, (res) => {
          resolve((res[SESSION_KEY_NAME] as string) || null);
        });
      });
      if (keyBase64) memorySessionKeyBase64 = keyBase64;
    }

    if (!keyBase64) return null;
    this.updateActivity();
    return cryptoService.importKey(keyBase64);
  },

  async setSessionKey(key: CryptoKey): Promise<void> {
    const keyBase64 = await cryptoService.exportKey(key);
    memorySessionKeyBase64 = keyBase64;
    
    if (isChromeStorageSessionAvailable()) {
      await new Promise<void>((resolve) => {
        chrome.storage.session.set({ [SESSION_KEY_NAME]: keyBase64 }, () => {
          resolve();
        });
      });
    }
    this.updateActivity(true);
  },

  async lockVault(): Promise<void> {
    memorySessionKeyBase64 = null;
    localStorage.removeItem('formpilot_last_activity');
    localStorage.removeItem('formpilot_last_write');
    if (isChromeStorageSessionAvailable()) {
      await new Promise<void>((resolve) => {
        chrome.storage.session.remove(SESSION_KEY_NAME, () => {
          resolve();
        });
      });
    }
  },

  updateActivity(force = false) {
    const now = Date.now();
    const lastWrite = parseInt(localStorage.getItem('formpilot_last_write') || '0', 10);
    if (force || now - lastWrite > 2000) {
      localStorage.setItem('formpilot_last_activity', now.toString());
      localStorage.setItem('formpilot_last_write', now.toString());
    }
  },

  checkAutoLock(): boolean {
    const lastActivity = parseInt(localStorage.getItem('formpilot_last_activity') || '0', 10);
    if (lastActivity > 0 && Date.now() - lastActivity > autoLockTimeoutMinutes * 60 * 1000) {
      this.lockVault();
      return true;
    }
    return false;
  },

  setAutoLockTimeout(minutes: number) {
    autoLockTimeoutMinutes = minutes;
  }
};

if (isChromeStorageSessionAvailable()) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'session' && changes[SESSION_KEY_NAME]) {
      // If the key was removed (e.g. by another tab locking), clear memory
      if (!changes[SESSION_KEY_NAME].newValue) {
        memorySessionKeyBase64 = null;
      }
    }
  });
}

// Simple auto-lock interval check within the same context
setInterval(() => {
  authService.checkAutoLock();
}, 60000); // check every minute
