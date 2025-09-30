import crypto, { CipherKey } from "crypto";
import dotenv from "dotenv";
import { authenticationService } from "../services/index.js";
dotenv.config();

// Encryption algorithm and key
const algorithm = process.env.ENCRYPTION_ALGO as string;
const key = Buffer.from(process.env.ENCRYPTION_KEY as string, 'hex'); // 32 bytes key for AES-256
const iv = crypto.randomBytes(12);

// Encrypt function
function encrypt(text: string) {
  try {
  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv(algorithm, key as CipherKey, new Uint8Array(iv));
  let encrypted = cipher.update(text, 'hex');
  encrypted = Buffer.concat([new Uint8Array(encrypted), new Uint8Array(cipher.final())]);
  // Return iv and encrypted data combined
  return iv.toString('hex') + ':' + encrypted.toString('hex');
  }
  catch(err) {
    console.log("Encryption Error: ",err);
  }
}

function encryptUtf(text: string) {
  try {
  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv(algorithm, key as CipherKey, new Uint8Array(iv));
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([new Uint8Array(encrypted), new Uint8Array(cipher.final())]);
  // Return iv and encrypted data combined
  return iv.toString('hex') + ':' + encrypted.toString('hex');
  }
  catch(err) {
    console.log("Encryption Error: ",err);
  }
}
 
// Decrypt function 
function decrypt(text: string) {
  try {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex as string,"hex");
    const encryptedText = Buffer.from(encryptedHex as string,"hex");
    const decipher = crypto.createDecipheriv(algorithm, key as CipherKey, new Uint8Array(iv));
    let decrypted = decipher.update(new Uint8Array(encryptedText));
    decrypted = Buffer.concat([new Uint8Array(decrypted), new Uint8Array(decipher.final())]);
    return decrypted.toString('hex');
  }
  catch (err) {
    console.log("Decryption Error: ", err);
  }
}

function decryptUtf(text: string): string | undefined {
  try {
    const [ivHex, encryptedHex] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key as CipherKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8'); // ✅ match the original input encoding
  } catch (err) {
    console.log("Decryption Error: ", err);
  }
}

function encryptData(payload: any, secretKey: string, iv: string) {
  // Ensure the payload is a JSON string
  const jsonString = JSON.stringify(payload);

  // Create a cipher instance
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(secretKey) as CipherKey, new Uint8Array(Buffer.from(iv)));

  // Encrypt the data
  let encryptedData = cipher.update(jsonString, 'utf8', 'hex');
  encryptedData += cipher.final('hex');

  return encryptedData;
}

function decryptData(encryptedData: string, secretKey: string, iv: string) {
  // Create a decipher instance
  const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(secretKey) as CipherKey, new Uint8Array(Buffer.from(iv)));

  // Decrypt the data
  let decryptedData = decipher.update(encryptedData, 'hex', 'utf8');
  decryptedData += decipher.final('utf8');

  // Parse the decrypted JSON string
  const payload = JSON.parse(decryptedData);

  return payload;
}

async function callbackEncrypt(payload: string, userId: number) {
  try {
    console.log("User Id: ", userId);
    const key = await authenticationService.getDecryptionKey(userId);
    console.log("Key: ", key);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex') as CipherKey, new Uint8Array(iv));
    const encrypted = Buffer.concat([new Uint8Array(cipher.update(payload, 'utf8')), new Uint8Array(cipher.final())]);
    const tag = cipher.getAuthTag();
    return {
      encrypted_data: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64')
    };
  }
  catch (err) {
    console.log(err);
  }
}

async function callbackDecrypt(encryptedData: string, iv: string, tag: string) {
  try {
    // Convert Base64 inputs to Buffers
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    const ivBuffer = Buffer.from(iv, 'base64');
    const tagBuffer = Buffer.from(tag, 'base64');

    const key = await authenticationService.getDecryptionKey(5);

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, "hex") as CipherKey, new Uint8Array(ivBuffer));

    // Set the authentication tag
    decipher.setAuthTag(new Uint8Array(tagBuffer));

    // Decrypt the ciphertext
    const decrypted = Buffer.concat([
      new Uint8Array(decipher.update(new Uint8Array(encryptedBuffer))),
      new Uint8Array(decipher.final())
    ]);

    // Return plaintext as a string
    return decrypted.toString('utf8');
  } catch (err) {
    // Handle decryption errors (e.g., invalid tag or tampered data)
    throw new Error('Decryption failed: Authentication tag is invalid or data was tampered with.');
  }
}

export { encrypt, decrypt, encryptData, decryptData, callbackEncrypt, callbackDecrypt, decryptUtf, encryptUtf };
