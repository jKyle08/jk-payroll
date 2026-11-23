// ==============================================================================
// JK-PAYROLL: ENCRYPTION & DATA MASKING SERVICE
// AES-256-GCM Authenticated Encryption for Sensitive Identifiers (TIN, EIN, SSN)
// File: src/server/security/encryption.service.ts
// ==============================================================================

import crypto from 'node:crypto';
import { ENV } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag
const CURRENT_KEY_VERSION = 'v1';

export class EncryptionService {
  private masterKey: Buffer;

  constructor() {
    // Derive a stable 256-bit (32 bytes) key using SHA-256
    const secretSource = process.env.STATUTORY_ENCRYPTION_KEY || ENV.JWT_SECRET || 'paypulse-statutory-encryption-key-fallback';
    this.masterKey = crypto.createHash('sha256').update(secretSource).digest();
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns encrypted payload containing IV, AuthTag, and Ciphertext in hex.
   */
  public encrypt(plaintext: string): {
    encryptedValue: string;
    keyVersion: string;
    maskedValue: string;
  } {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a non-empty string');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    const encryptedValue = `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
    const maskedValue = this.mask(plaintext);

    return {
      encryptedValue,
      keyVersion: CURRENT_KEY_VERSION,
      maskedValue,
    };
  }

  /**
   * Decrypts an AES-256-GCM encrypted payload.
   */
  public decrypt(encryptedPayload: string, keyVersion = CURRENT_KEY_VERSION): string {
    if (!encryptedPayload) {
      throw new Error('Encrypted payload is required');
    }

    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      // If legacy or unformatted plaintext was passed, return as-is
      return encryptedPayload;
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Masks sensitive identifier preserving standard readability.
   * Shows only the last 4 characters (or asterisks/dots if shorter).
   */
  public mask(value: string): string {
    if (!value) return '';
    const trimmed = value.trim();
    if (trimmed.length <= 4) {
      return '•'.repeat(trimmed.length);
    }
    const visibleLength = 4;
    const maskedLength = trimmed.length - visibleLength;
    return '•'.repeat(maskedLength) + trimmed.slice(-visibleLength);
  }
}

export const encryptionService = new EncryptionService();
