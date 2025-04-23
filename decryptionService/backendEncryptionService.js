const crypto = require("crypto");

const SECRET_KEY = process.env.ENCRYPTION_KEY || "SuperSecretKey123!"; // Must match frontend

function deriveKey(secret, salt) {
    return crypto.pbkdf2Sync(secret, salt, 100000, 32, "sha256"); // 32 bytes key for AES-256
}

function encryptData(data) {
    const iv = crypto.randomBytes(12); // 12-byte IV for AES-GCM
    const salt = crypto.randomBytes(16); // Unique salt for each encryption
    const key = deriveKey(SECRET_KEY, salt); // Derive the encryption key

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "base64");
    encrypted += cipher.final("base64");
    const authTag = cipher.getAuthTag(); // Required for AES-GCM

    return {
        iv: iv.toString("base64"),
        salt: salt.toString("base64"),
        ciphertext: encrypted,
        authTag: authTag.toString("base64"), // Send to frontend for verification
    };
}

module.exports = { encryptData };

// Example Testing
const encryptedData = encryptData({
    name: "Bhava Hawa",
    email: "BhauKhau.com",
});
console.log(
    "Encrypted Data Sent to Frontend:",
    JSON.stringify(encryptedData, null, 2)
);