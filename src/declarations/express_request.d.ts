import { JwtPayload } from "jsonwebtoken";
import { Request } from "express";

// Extend the Request interface
declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayload;
    }
  }
}
