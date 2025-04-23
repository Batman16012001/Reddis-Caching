// const DecryptionService = require('./decryptQueryParams.js');
const DecryptionService = require('../decryptionService/decryptionService')

async function testDecryption() {
    try {
        // You'll replace this with an actual encrypted sample from your frontend
        const encryptedSample = "eyJpdiI6WzE3NSwxMDAsNCwyNDUsMTEzLDczLDExMCwxNzcsNTQsMTcxLDQ1LDE4M10sInNhbHQiOls1OSwyNDIsOTcsODIsMTIzLDEzMSw5LDE5MCw2OSwyNDYsMjE1LDYyLDI0NCwyNDUsMTQwLDk3XSwiY2lwaGVydGV4dCI6WzIwNSw4NCwyMCwzMiw4NCwxNDgsMTI0LDIzMiwyNDYsMjI2LDE0MSwzNiwxMzksMTk3LDIwLDEyNiwxMzcsMjUzLDI2LDI1MCwxOTMsNjYsNDQsMTA2LDM3LDMxLDE3NSwxNzQsMjQwLDE0NSwxNDksMTIxLDIyMCwxODgsNywxMjEsNDcsMTE5LDE0NCwyMDYsMjAwLDc1LDE0OCwxMjcsMTcsMjA4LDIyLDIyNSwxMTYsMzgsMjA0LDQ5LDE1MCwyNDgsMjE3LDE3NiwyMDgsMTA5LDIwOSwyMDgsODAsMTExLDE0NCwxLDE2NCwxODgsMTU5LDIxMCwxMzEsMTgwLDI1LDEyMiw2OSwyNywxMDYsMTA3LDM0LDksMjM3LDQsMjIsMjAxLDE3OCwxODQsOTQsMTExLDg1LDE3LDEzLDY0LDE3NSw5MSwyMCwxMzEsMTU3LDE1OCwxNTgsMjMwLDEwNSwzNSw2LDQxLDE4NCwxOSw2OCwxNDMsNjUsMTgwLDM3LDQwLDE5MSw4NywyMTAsMjYsMTM4LDE1MCw0NiwyNTMsMTkwLDk3LDIwMywyMjcsMTExLDI1NCwxNTEsMTE1XX0=";

        const decryptionService = new DecryptionService();
        const decrypted = await decryptionService.decrypt(encryptedSample);

        console.log('Successfully decrypted data:');
        console.log(JSON.stringify(decrypted, null, 2));
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testDecryption();