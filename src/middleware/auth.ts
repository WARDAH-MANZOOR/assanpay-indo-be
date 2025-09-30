import { Request, Response, NextFunction, RequestHandler } from "express";
import {
  verifyHashedKey,
} from "../utils/authentication.js";
import prisma from "../lib/prisma.js";
import dotenv from "dotenv";
dotenv.config();

export const apiKeyAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract the API key from headers
  const apiKey = req.headers["x-api-key"] as string;
  const { merchantId } = req.params;

  if (!merchantId) {
    res.status(400).json({ error: "Merchant ID is required" });
    return

  }

  // Check if API key is missing
  if (!apiKey) {
    res.status(401).json({ error: "API key is missing" });
    return

  }

  try {
    // Retrieve the user associated with the API key from the database
    const merchant = await prisma.merchant.findFirst({
      where: {
        uid: merchantId,
      },
    });

    if (!merchant) {
      res.status(403).json({ error: "Unauthorized: Invalid API key" });
      return

    }

    const user = await prisma.user.findFirst({
      where: {
        id: merchant?.user_id,
      },
    });

    if (!user) {
      res.status(403).json({ error: "Unauthorized: Invalid API key" });
      return

    }

    const hashedKey = user?.apiKey;

    if (!hashedKey) {
      res.status(403).json({ error: "Unauthorized: Invalid API key" });
      return

    }

    const verify = verifyHashedKey(apiKey, hashedKey as string);
    if (!verify) {
      res.status(403).json({ error: "Unauthorized: Invalid API key" });
      return
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const uidAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Extract the API key from headers
  const { merchantId } = req.params;
  if (!merchantId) {
    res.status(400).json({ error: "Merchant ID is required" });
    return
  }
  try {
    // Retrieve the user associated with the API key from the database
    const merchant = await prisma.merchant.findFirst({
      where: {
        uid: merchantId,
      },
    });

    if (!merchant) {
      res.status(403).json({ error: "Invalid Merchant Id" });
      return
    }
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};