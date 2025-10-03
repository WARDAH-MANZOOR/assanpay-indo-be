// import crypto from "crypto";

// export function generateStarPagoSignature(appSecret: string, data: any): string {
//   // Step 1: Flatten data into sorted key=value string
//   const flatData = (obj: any, prefix = ''): any => {
//     return Object.keys(obj)
//       .sort()
//       .map(key => {
//         const value = obj[key];
//         if (typeof value === 'object' && value !== null) {
//           return flatData(value, `${prefix}${key}.`);
//         }
//         return `${prefix}${key}=${value}`;
//       })
//       .flat()
//       .join("&");
//   };

//   const rawString = flatData(data);

//   // Step 2: Add secret key
//   const stringToSign = rawString + appSecret;

//   // Step 3: MD5 hash (hex)
//   return crypto.createHash("md5").update(stringToSign).digest("hex");
// }



import crypto from "crypto";

/**
 * Generate StarPago signature
 */
export function generateStarPagoSignature(params: any, appSecret: string): string {
  const parseExtra = (extra: any) => {
    if (!extra || typeof extra !== 'object') return '';
    const keys = Object.keys(extra).sort();
    return keys.map(k => `${k}=${extra[k]}`).join('&');
  }

  // filter out undefined, null or empty string keys
  const topKeys = Object.keys(params).filter(k => k !== 'sign' && params[k] !== undefined && params[k] !== null && params[k] !== '');
  topKeys.sort();

  const paramsString = topKeys.map(k => {
    if (typeof params[k] === 'object') {
      return `${k}=${parseExtra(params[k])}`;
    }
    return `${k}=${params[k]}`;
  }).join('&');

  const stringToSign = `${paramsString}&key=${appSecret}`;

  return crypto.createHash('sha256').update(stringToSign, 'utf8').digest('hex');
}

