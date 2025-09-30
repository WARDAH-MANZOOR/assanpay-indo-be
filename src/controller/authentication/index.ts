import { NextFunction, Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import CustomError from "../../utils/custom_error.js";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import {validationResult}  from "express-validator";
import {
  comparePasswords,
  findUserByEmail,
  generateToken,
  getUserByEmail,
  getUserPassword,
  hashPassword,
  setTokenCookie,
  updateUserPassword,
} from "../../services/authentication/index.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { authenticationService } from "../../services/index.js";

const logout = async (req: Request, res: Response) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).send({ message: "Logged out Successfully" });
};

const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Validate request data
  const errors = validationResult(req);
  if (errors.array().length > 0) {
    // Return validation errors
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const { email, password } = req.body;

  try {
    // Fetch user by email
    const user = await getUserByEmail(email);

    if (!user) {
      const error = new CustomError("Invalid email or password", 401);
      res.status(401).json(ApiResponse.error(error.message));
      return;
    }

    if (!user.password || user.password.trim() === "") {
      const error = new CustomError(
        "Please sign up first with the given email",
        400
      );
      res.status(400).json(ApiResponse.error(error.message));
      return;
    }
    // Compare passwords
    const isPasswordValid = await comparePasswords(
      password,
      user?.password as string
    );
    if (!isPasswordValid) {
      const error = new CustomError("Invalid email or password", 401);
      res.status(401).json(ApiResponse.error(error.message));
      return;
    }

    // Extract the group name (role) from the user's groups
    const userGroup = user?.groups[0]; // Assuming one group per user
    const role = userGroup.group.name == "Admin" || userGroup.group.name == "Merchant" ? userGroup.group.name : "User"; // Default role if no group found
    const merchant = await prisma.userGroup.findMany({
      where: {
        userId: user?.id,
      },
      include: {
        merchant: {
          include: {
            commissions: true,
          },
        },
        group: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      },
    });
    
    // Generate JWT token
    const token = generateToken({
      email: user?.email,
      role,
      id: user?.id,
      merchant_id: merchant[0]?.merchantId,
      group: userGroup,
      permissions: merchant[0]?.group.permissions.map((permission: any) => permission.permission.name),
      uid: merchant[0]?.merchant?.uid,
    });

    // Set token in cookies
    setTokenCookie(res, token);

    // Return user details
    res.status(200).json(
      ApiResponse.success({
        message: "Login successful.",
        token: token,
        role: role,
        username: user?.username,
        email: user?.email,
        id: user?.id,
        merchantId: merchant[0]?.merchantId,
        uid: merchant[0]?.merchant?.uid,
        merchant: { 
          ...merchant[0],
          group: undefined 
        },
        commission: merchant[0]?.merchant?.commissions[0],
        disburseBalancePercent: merchant[0]?.merchant?.disburseBalancePercent,
      })
    );
  } catch (error) {
    console.error(error);
    const err = new CustomError("Something went wrong!", 500);
    next(err);
  }
};

const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Step 1: Validate Request Data
    validationResult(req);

    // Step 2: Extract Data from Request
    const { email, password } = req.body;

    // Step 3: Check if User Exists with Customer Email
    const user = await findUserByEmail(email);

    if (!user) {
      throw new CustomError(
        "You are not registered. Please contact support.",
        400
      );
    }

    // Step 4: Encrypt Password
    const hashedPassword = await hashPassword(password);

    // Step 5: Update User Record with Encrypted Password
    await updateUserPassword(user.id, hashedPassword);

    // Step 6: Generate JWT Token
    const token = generateToken({
      email: user.email,
      id: user.id,
      role: "user", // Adjust role as necessary
    });

    res.cookie("token", token, {
      httpOnly: true,
    });

    // Step 7: Send Response
    res.status(200).json(
      ApiResponse.success({
        message: "Signup successful.",
        token,
        user: {
          id: user.id,
          email: user.email,
        },
      })
    );
  } catch (error) {
    console.error("Error during signup:", error);

    if (error instanceof CustomError) {
      res
        .status(error.statusCode)
        .json(ApiResponse.error(error.message));
        return;
    }

    res.status(500).json(ApiResponse.error("Internal server error"));
  }
};

const getAPIKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    if (!id) {
      throw new CustomError("Invalid user id", 400);
    }

    const result = await authenticationService.getAPIKey(id);
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const getDecryptionKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    if (!id) {
      throw new CustomError("Invalid user id", 400);
    }

    const result = await authenticationService.getDecryptionKey(id);
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const createAPIKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) : Promise<void>=> {
  try {
    const id = parseInt(req.params.id);

    if (!id) {
      throw new CustomError("Invalid user id", 400);
    }

    const result = await authenticationService.createAPIKey(id);
    res.status(200).json(ApiResponse.success(result));
    return;
  } catch (error) {
    next(error);
  }
};

const createDecryptionKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params.id);

    if (!id) {
      throw new CustomError("Invalid user id", 400);
    }

    const result = await authenticationService.createDecryptionKey(id);
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const updatePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const old_password = await getUserPassword((req.user as JwtPayload)?.merchant_id);
    if(!(await comparePasswords(req.body.old_password, old_password?.password as string))) {
      throw new CustomError("Old password do not match",500);
    }
    let new_password = await hashPassword(req.body.new_password);
    updateUserPassword((req.user as JwtPayload)?.merchant_id,new_password);
    res.status(200).json(ApiResponse.success({"message": "Password updated successfully"}))
  }
  catch(err) {
    next(err);
  }
}

export { logout, login, signup, getAPIKey };

export default {
  getAPIKey,
  createAPIKey,
  updatePassword,
  createDecryptionKey,
  getDecryptionKey
};
