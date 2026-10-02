export interface EncryptedVault {
  version: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

const ITERATIONS = 210000;
const HASH = 'SHA-256';
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export const cryptoService = {
  generateSalt(): string {
    return arrayBufferToBase64(crypto.getRandomValues(new Uint8Array(16)).buffer);
  },

  async deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const saltBuffer = base64ToArrayBuffer(saltBase64);

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: ITERATIONS,
        hash: HASH,
      },
      passwordKey,
      { name: ALGORITHM, length: KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
  },

  async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    return arrayBufferToBase64(exported);
  },

  async importKey(keyBase64: string): Promise<CryptoKey> {
    const keyBuffer = base64ToArrayBuffer(keyBase64);
    return crypto.subtle.importKey(
      'raw',
      keyBuffer,
      ALGORITHM,
      true,
      ['encrypt', 'decrypt']
    );
  },

  async encryptData(data: any, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      key,
      encodedData
    );

    return {
      ciphertext: arrayBufferToBase64(encryptedBuffer),
      iv: arrayBufferToBase64(iv.buffer),
    };
  },

  async decryptData(encrypted: { ciphertext: string; iv: string }, key: CryptoKey): Promise<any> {
    const ivBuffer = base64ToArrayBuffer(encrypted.iv);
    const cipherBuffer = base64ToArrayBuffer(encrypted.ciphertext);

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: ALGORITHM,
          iv: new Uint8Array(ivBuffer),
        },
        key,
        cipherBuffer
      );

      const decoder = new TextDecoder();
      const decodedString = decoder.decode(decryptedBuffer);
      return JSON.parse(decodedString);
    } catch (e) {
      throw new Error('Decryption failed. Incorrect password or corrupted data.');
    }
  }
};
