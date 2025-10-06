/**
 * Encryption utilities for secure messaging
 * Implements AES-256-GCM encryption for end-to-end security
 */

import CryptoJS from 'crypto-js';

class SecureMessaging {
    constructor() {
        this.keySize = 256;
        this.ivSize = 128;
        this.saltSize = 256;
        this.iterationCount = 10000;
    }

    /**
     * Generate a random encryption key
     * @returns {string} Base64 encoded key
     */
    generateKey() {
        return CryptoJS.lib.WordArray.random(this.keySize / 8).toString(CryptoJS.enc.Base64);
    }

    /**
     * Derive key from password using PBKDF2
     * @param {string} password - User password
     * @param {string} salt - Salt for key derivation
     * @returns {string} Derived key
     */
    deriveKey(password, salt) {
        return CryptoJS.PBKDF2(password, salt, {
            keySize: this.keySize / 32,
            iterations: this.iterationCount
        });
    }

    /**
     * Encrypt a message using AES-256-GCM
     * @param {string} message - Plain text message
     * @param {string} password - Encryption password
     * @returns {object} Encrypted data with IV and salt
     */
    encryptMessage(message, password) {
        try {
            // Generate random salt and IV
            const salt = CryptoJS.lib.WordArray.random(this.saltSize / 8);
            const iv = CryptoJS.lib.WordArray.random(this.ivSize / 8);
            
            // Derive key from password
            const key = this.deriveKey(password, salt);
            
            // Encrypt the message
            const encrypted = CryptoJS.AES.encrypt(message, key, {
                iv: iv,
                mode: CryptoJS.mode.GCM,
                padding: CryptoJS.pad.NoPadding
            });

            return {
                encrypted: encrypted.toString(),
                salt: salt.toString(CryptoJS.enc.Base64),
                iv: iv.toString(CryptoJS.enc.Base64),
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt message');
        }
    }

    /**
     * Decrypt a message using AES-256-GCM
     * @param {object} encryptedData - Encrypted data object
     * @param {string} password - Decryption password
     * @returns {string} Decrypted message
     */
    decryptMessage(encryptedData, password) {
        try {
            const { encrypted, salt, iv } = encryptedData;
            
            // Convert salt and IV back to WordArray
            const saltWordArray = CryptoJS.enc.Base64.parse(salt);
            const ivWordArray = CryptoJS.enc.Base64.parse(iv);
            
            // Derive key from password
            const key = this.deriveKey(password, saltWordArray);
            
            // Decrypt the message
            const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
                iv: ivWordArray,
                mode: CryptoJS.mode.GCM,
                padding: CryptoJS.pad.NoPadding
            });

            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt message - invalid password or corrupted data');
        }
    }

    /**
     * Generate a secure room key for group encryption
     * @returns {string} Room encryption key
     */
    generateRoomKey() {
        return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64);
    }

    /**
     * Hash a password securely
     * @param {string} password - Password to hash
     * @returns {string} Hashed password
     */
    hashPassword(password) {
        const salt = CryptoJS.lib.WordArray.random(128/8);
        const hash = CryptoJS.PBKDF2(password, salt, {
            keySize: 512/32,
            iterations: 10000
        });
        return salt.toString() + ':' + hash.toString();
    }

    /**
     * Validate input for security
     * @param {string} input - Input to validate
     * @returns {boolean} Is input safe
     */
    validateInput(input) {
        if (!input || typeof input !== 'string') return false;
        if (input.length > 10000) return false; // Prevent DoS
        
        // Basic XSS prevention
        const dangerousPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi
        ];
        
        return !dangerousPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Sanitize input string
     * @param {string} input - Input to sanitize
     * @returns {string} Sanitized input
     */
    sanitizeInput(input) {
        if (!this.validateInput(input)) {
            throw new Error('Invalid or potentially dangerous input detected');
        }
        
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
}

export default SecureMessaging;