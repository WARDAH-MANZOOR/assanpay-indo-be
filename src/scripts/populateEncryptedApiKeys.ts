import { PrismaClient } from "@prisma/client";
import {
  encryptApiKey,
  generateApiKey,
  hashApiKey,
} from "../utils/authentication.js";
import crypto from "crypto"

const prisma = new PrismaClient();
export const populateEncryptedApiKeysForExistingUsers = async () => {
  // Find all users without an API key
  const usersWithoutApiKey = await prisma.user.findMany({
    // where: { apiKey: null },
  });

  for (const user of usersWithoutApiKey) {
    // Generate a new API key
    const plainApiKey = generateApiKey();

    // Hash the API key
    const hashedKey = hashApiKey(plainApiKey);
    // console.log(`Merchant Key: ${plainApiKey}\nHashed Key: ${hashedKey}\n`);

    // Update the user with the encrypted API key
    await prisma.user.update({
      where: { id: user.id },
      data: { apiKey: hashedKey },
    });

    console.log(`API key generated and encrypted for user ID: ${user.id}`);
  }

  console.log("Encrypted API keys populated for all existing users.");
};

export const populateEncryptedDecryptionKeysForExistingUsers = async () => {
  // Find all users without an API key
  const usersWithoutApiKey = await prisma.user.findMany({
    // where: { apiKey: null },
  });

  for (const user of usersWithoutApiKey) {
    // Generate a new API key
    const plainApiKey = crypto.randomBytes(32);

    // Hash the API key
    const hashedKey = plainApiKey.toString("hex");
    // console.log(`Merchant Key: ${plainApiKey}\nHashed Key: ${hashedKey}\n`);

    // Update the user with the encrypted API key
    await prisma.user.update({
      where: { id: user.id },
      data: { decryptionKey: hashedKey },
    });

    console.log(`API key generated and encrypted for user ID: ${user.id}`);
  }

  console.log("Encrypted API keys populated for all existing users.");
};
