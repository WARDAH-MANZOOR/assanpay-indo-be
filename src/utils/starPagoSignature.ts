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
export function generateStarPagoSignature(appSecret: string, data: any): string {
  const flatData = (obj: any, prefix = ""): string[] => {
    return Object.keys(obj)
      .sort()
      .flatMap((key) => {
        const value = obj[key];
        if (value === undefined || value === null || value === "") return [];
        if (typeof value === "object" && !Array.isArray(value)) {
          return flatData(value, `${prefix}${key}.`);
        }
        return [`${prefix}${key}=${value}`];
      });
  };

  const rawString = flatData(data).join("&");
  const stringToSign = rawString + appSecret;

  return crypto.createHash("md5").update(stringToSign).digest("hex");
}

