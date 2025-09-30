import { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import CustomError from "./custom_error.js";
import prisma from "../lib/prisma.js";
import ApiResponse from "../utils/ApiResponse.js";

const isLoggedIn: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if the token exists
    if (!req.cookies.token) {
      res.status(401).send("You must be logged in");
      return;
    } 

    // Verify the JWT token
    const data = jwt.verify(
      req.cookies.token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;
    // Attach the user data to req.user
    req.user = data;

    // Proceed to the next middleware
    return next();
  } catch (error) {
    res.status(401).json(ApiResponse.error("You must be logged in", 401));
  }
};

const checkOtp: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {accountNo, provider, payId, otp} = req.body;

    // Verify the otp
    const record = await prisma.paymentRequest.findFirst({
      where: {
        AND: [
          {
            metadata: {
              path: ["otp"],
              equals: otp
            }
          },
          {
            metadata: {
              path: ["phone"],
              equals: accountNo
            }
          }
        ]
      }
    })

    if (!record) {
      res.status(401).send("Invalid OTP");
      return;
    }

    // Proceed to the next middleware
    return next();
  } catch (error) {
    res.status(401).json(ApiResponse.error("Invalid otp or phone mapping", 401));
  }
}

const restrict = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let user: JwtPayload = req.user as JwtPayload;
    if (user?.role !== role) {
      const error = new CustomError(
        "You are forbidden to perform this action",
        403
      );
      return next(error);
    }
    next();
  };
};

const restrictMultiple = (...role: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    let user: JwtPayload = req.user as JwtPayload;
    if (!role.includes(user?.role)) {
      const error = new CustomError(
        "You are forbidden to perform this action",
        403
      );
      return next(error);
    }
    next();
  };
};
const errorHandler: ErrorRequestHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Check if the response headers have already been sent
  if (res.headersSent) {
    return next(err); // Delegate to the default Express error handler
  }

  // Handle operational errors (CustomError)
  if (err.isOperational) {
    console.log("Operational Error:", err.statusCode, err.message);
    res.status(err.statusCode).json({
      statusText: err.statusText,
      status: err.statusCode,
      message: err.message,
    });
    return;
  }

  // Log non-operational or unknown errors for debugging
  console.error("An unexpected error occurred:", err);

  // Send a generic error response
  res.status(500).json({
    status: "error",
    message: "Something went wrong",
  });
};

const authorize = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = (req.user as JwtPayload)?.id; // Assume user ID is set in req.user

    const userGroups = await prisma.userGroup.findMany({
      where: { userId },
      include: { group: { include: { permissions: true } } },
    });

    const permission = await prisma.permission.findFirst({
      where: { name: permissionName },
    });

    const hasPermission = userGroups.some((group) =>
      group.group.permissions.some(
        (permission2) => permission2.permissionId === permission?.id
      )
    );

    if (!hasPermission) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    next();
  };
};

const isAdmin: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if ((req.user as JwtPayload)?.role === "Admin") {
    return next(); // Correctly calls the next middleware
  }

  res.status(403).json(
    ApiResponse.error("You are not authorized to perform this action", 403)
  );
};

const checkWebhookSecret = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (req.headers["x-webhook-secret"] == "17bf859d-d2db-4503-8dbf-c332183434d2") {
    return next();
  }

  res.status(403).json(
    ApiResponse.error("Webhook Secret is not valid", 403)
  );
}


export {
  isLoggedIn,
  restrict,
  errorHandler,
  restrictMultiple,
  authorize,
  isAdmin,
  checkOtp,
  checkWebhookSecret
};
