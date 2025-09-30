import { AUTH } from "../constants/auth.js";
import crypto, { CipherKey } from "crypto";

const encryptionKey = Buffer.from(AUTH.ENCRYPTION_KEY!, "hex"); // 32 bytes key for AES-256
const ivLength = Buffer.alloc(16, 0); // Static 16-byte IV

const generateApiKey = () => {
  const prefix = AUTH.API_KEY_PREFIX;
  const apiKey = crypto.randomBytes(16).toString("hex"); // 32-character hex string

  // Inserting dashes to format the API key
  const formattedApiKey = `${prefix}-${apiKey.slice(0, 4)}-${apiKey.slice(
    4,
    8
  )}-${apiKey.slice(8, 12)}-${apiKey.slice(12, 16)}`;

  return formattedApiKey;
};

// Encrypt the API key
const encryptApiKey = (apiKey: string): string => {
  const cipher = crypto.createCipheriv("aes-256-cbc", encryptionKey as CipherKey, ivLength.toString("hex"));
  let encrypted = cipher.update(apiKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

// Decrypt the API key
const decryptApiKey = (encryptedApiKey: string): string => {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    encryptionKey as CipherKey,
    ivLength.toString("hex")
  );
  let decrypted = decipher.update(encryptedApiKey, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};

// Hash the KEY
const hashApiKey = (apiKey: string): string => {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
};

const verifyHashedKey = (apiKey: string, storedHash: string): boolean => {
  const hashedKey = hashApiKey(apiKey);
  return crypto.timingSafeEqual(
    new Uint8Array(Buffer.from(hashedKey)),
    new Uint8Array(Buffer.from(storedHash))
  );
};

export {
  generateApiKey,
  encryptApiKey,
  decryptApiKey,
  hashApiKey,
  verifyHashedKey,
};
