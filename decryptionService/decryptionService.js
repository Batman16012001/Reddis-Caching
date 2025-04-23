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

            // Try alternative decryption approach - treating the entire ciphertext as data + tag
            const algorithm = 'aes-256-gcm';
            const decipher = crypto.createDecipheriv(algorithm, key, iv);

            // In Web Crypto, the auth tag is part of the ciphertext
            // For node's crypto, we need to extract it (16 bytes from the end)
            const tagLength = 16;

            if (ciphertext.length <= tagLength) {
                throw new Error('Ciphertext too short');
            }

            const actualCiphertext = ciphertext.slice(0, ciphertext.length - tagLength);
            const authTag = ciphertext.slice(ciphertext.length - tagLength);

            // Set the auth tag
            decipher.setAuthTag(authTag);

            // Decrypt
            let decrypted = decipher.update(actualCiphertext);
            try {
                decrypted = Buffer.concat([decrypted, decipher.final()]);
            } catch (finalError) {
                // Try with a different approach - some implementations might not separate the auth tag
                logger.error("First approach failed, trying alternative...");

                // Try treating the entire buffer as containing both data and tag
                const decipher2 = crypto.createDecipheriv(algorithm, key, iv);
                try {
                    let result = decipher2.update(ciphertext);
                    result = Buffer.concat([result, decipher2.final()]);
                    return JSON.parse(result.toString());
                } catch (finalError2) {
                    logger.error("Both decryption approaches failed");
                    throw finalError2;
                }
            }

            return JSON.parse(decrypted.toString());
        } catch (error) {
            logger.error(`Detailed error: ${JSON.stringify(error)}`);
            throw new Error(`Failed to decrypt data: ${error.message}`);
        }
    }
}

module.exports = DecryptionService;