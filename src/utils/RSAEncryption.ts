import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

class RSAEncryption {
  public static getPublicKey(filename: string): crypto.KeyObject {
    const keyBytes = fs.readFileSync(path.resolve(filename));
    return crypto.createPublicKey({
      key: keyBytes,
      format: 'pem',
      type: 'spki'
    });
  }

  public static encrypt(data: string, publicKey: crypto.KeyObject): string {
    const encrypted = crypto.publicEncrypt(
      {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      new Uint8Array(Buffer.from(data))
    );
    return encrypted.toString('base64');
  }
}

export default RSAEncryption;
