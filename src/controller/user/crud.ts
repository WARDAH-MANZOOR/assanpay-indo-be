// src/controllers/userController.ts
import { Request, Response } from 'express';
import * as userService from '../../services/user/crud.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { JwtPayload } from 'jsonwebtoken';

// Create User
const createUser = async (req: Request, res: Response): Promise<void> => {
  const { fullName, email, password, group } = req.body;
  const merchantId = (req.user as JwtPayload)?.merchant_id; 
  if (!merchantId) {
    res.status(401).json(ApiResponse.error('Unauthorized',401));
    return;
  }
  try {
    const user = await userService.createUser(fullName, email, password, group, merchantId);
    res.status(201).json(ApiResponse.success(user));
  } catch (error) {
    console.error(error);
    res.status(500).json(ApiResponse.error('Error creating user',500));
  }
};

// Get User
const getUsers = async (req: Request, res: Response): Promise<void> => {
  const merchantId = (req.user as JwtPayload)?.merchant_id; 
  if (!merchantId) {
    res.status(401).json(ApiResponse.error('Unauthorized',401));
    return;
  }
  try {
    const user = await userService.getUsers(merchantId);
    if (!user) {
      res.status(404).json(ApiResponse.error('User not found',404));
      return;
    }
    res.json(ApiResponse.success(user));
  } catch (error) {
    console.error(error);
    res.status(500).json(ApiResponse.error('Error retrieving user',500));
  }
};

// Update User
const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { fullName, email, password, group  } = req.body;
  const merchantId = (req.user as JwtPayload)?.merchant_id; 
  if (!merchantId) {
    res.status(401).json(ApiResponse.error('Unauthorized',401));
    return;
  }
  try {
    const user = await userService.updateUser(
      parseInt(userId),
      fullName,
      email,
      merchantId,
      group,
      password,
    );
    if (!user) {
      res.status(404).json(ApiResponse.error('User not found',404));
      return;
    }
    res.json(ApiResponse.success(user));
  } catch (error) {
    console.error(error);
    res.status(500).json(ApiResponse.error('Error updating user',500));
  }
};

// Delete User
const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { userId } = req.params;
  const merchantId = (req.user as JwtPayload)?.merchant_id; 
  if (!merchantId) {
    res.status(401).json(ApiResponse.error('Unauthorized',401));
    return;
  }
  try {
    const result = await userService.deleteUser(parseInt(userId),merchantId);
    if (!result) {
      res.status(404).json(ApiResponse.error('User not found',404));
      return;
    }
    res.status(200).send(ApiResponse.success('User deleted successfully'));
  } catch (error) {
    console.error(error);
    res.status(500).json(ApiResponse.error('Error deleting user',500));
  }
};

export default {
  createUser,
  getUsers,
  updateUser,
  deleteUser
}