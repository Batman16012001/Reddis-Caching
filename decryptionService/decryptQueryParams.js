// Backend Decryption Service (DecryptionService.js)
const crypto = require('crypto');
require('dotenv').config();
const logger = require("../utils/logger")

class DecryptionService {
    constructor(secretKey = process.env.ENCRYPTION_KEY) {
        this.secretKey = secretKey;
    }

    async deriveKey(password, salt) {
        return new Promise((resolve, reject) => {
            crypto.pbkdf2(
                password,
                Buffer.from(salt),
                100000,
                32,
                'sha256',
                (err, derivedKey) => {
                    if (err) reject(err);
                    else resolve(derivedKey);
                }
            );
        });
    }

    // Special method for decrypting query parameters
    async decryptQueryParams(encryptedData) {
        try {
            logger.info(`Recevied encrypted queryParams in decrypQueryParams Service: ${JSON.stringify(encryptedData)}`);

            // Convert URL-safe Base64 back to regular Base64
            const base64Fixed = this.fromBase64URL(encryptedData);

            // Decode Base64 to string
            const payloadStr = Buffer.from(base64Fixed, 'base64').toString();
            // logger.info("Decoded payload string:", payloadStr);

            // Parse JSON
            const payload = JSON.parse(payloadStr);

            // Extract components (note: shortened key names)
            const iv = Buffer.from(payload.i);
            const salt = Buffer.from(payload.s);
            const ciphertext = Buffer.from(payload.c);

            logger.info(`Extracted IV length:" ${iv.length}`);
            logger.info(`Extracted salt length: ${salt.length}`);
            logger.info(`Extracted ciphertext length: ${ciphertext.length}`);

            // Derive the key
            const key = await this.deriveKey(this.secretKey, salt);

            // Decrypt
            const algorithm = 'aes-256-gcm';
            const decipher = crypto.createDecipheriv(algorithm, key, iv);

            // For Web Crypto AES-GCM, the auth tag is at the end of ciphertext
            const tagLength = 16;

            if (ciphertext.length <= tagLength) {
                throw new Error('Ciphertext too short');
            }

            const actualCiphertext = ciphertext.slice(0, ciphertext.length - tagLength);
            const authTag = ciphertext.slice(ciphertext.length - tagLength);

            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(actualCiphertext);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            return JSON.parse(decrypted.toString());
        } catch (error) {
            logger.error(`Query param decryption error details: ${JSON.stringify(error)}`);
            throw new Error(`Failed to decrypt query parameters: ${error.message}`);
        }
    }

    // Standard decrypt method (for data sent in POST requests)
    async decrypt(encryptedData) {
        try {
            // Parse the base64 encoded string
            const payloadStr = Buffer.from(encryptedData, 'base64').toString();
            const payload = JSON.parse(payloadStr);

            // Extract components
            const iv = Buffer.from(payload.iv);
            const salt = Buffer.from(payload.salt);
            const ciphertext = Buffer.from(payload.ciphertext);

            // Derive the key
            const key = await this.deriveKey(this.secretKey, salt);

            // Decrypt using AES-GCM
            const algorithm = 'aes-256-gcm';
            const decipher = crypto.createDecipheriv(algorithm, key, iv);

            // Extract auth tag (16 bytes from the end)
            const tagLength = 16;

            if (ciphertext.length <= tagLength) {
                throw new Error('Ciphertext too short');
            }

            const actualCiphertext = ciphertext.slice(0, ciphertext.length - tagLength);
            const authTag = ciphertext.slice(ciphertext.length - tagLength);

            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(actualCiphertext);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            return JSON.parse(decrypted.toString());
        } catch (error) {
            logger.error(`Decryption error details: ${JSON.stringify(error)}`);
            throw new Error(`Failed to decrypt data: ${error.message}`);
        }
    }

    // Helper for URL-safe Base64 decoding
    fromBase64URL(str) {
        // Add padding if needed
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) {
            str += '=';
        }
        return str;
    }
}

module.exports = DecryptionService;