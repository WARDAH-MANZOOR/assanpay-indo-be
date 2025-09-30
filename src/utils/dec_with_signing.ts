import crypto from "crypto";

const deriveKeys = (masterKey: Buffer) => {
  const hmacKey = crypto.createHmac('sha256', masterKey).update('HMAC_KEY').digest();
  const aesKey = crypto.createHmac('sha256', masterKey).update('ENC_KEY').digest().slice(0, 32); // 32 bytes for AES-256
  return { hmacKey, aesKey };
}