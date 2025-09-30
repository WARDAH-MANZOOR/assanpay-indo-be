// src/validators/userValidators.ts
import { body, param, validationResult } from 'express-validator';
import { JwtPayload } from 'jsonwebtoken';
import prisma from '../../lib/prisma.js';

// Validator for creating a user
const createUserValidator = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('group')
    .isInt()
    .withMessage('Group ID must be an integer')
    .custom(async value => {
      const group = await prisma.group.findUnique({ where: { id: Number(value) } })
      if (!group) {
        throw new Error("Group ID does not exist")
      }
    }),
];

// Validator for updating a user
const updateUserValidator = [
  param('userId').isInt().withMessage('User ID must be an integer').custom(async (value) => {
    const user = await prisma.user.findUnique({ where: { id: Number(value) } })
    if (!user) {
      throw new Error("User ID does not exist")
    }
  }),
  body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body("group")
    .optional()
    .isInt()
    .withMessage("Group ID must be an integer")
    .custom(async (value) => {
      const groups = await prisma.group.findUnique({
        where: { id: value },
      });

      if (!groups) {
        throw new Error("Group ID does not exist");
      }
    }),
];

// Validator for deleting a user
const deleteUserValidator = [
  param('userId')
    .isInt().
    withMessage('User ID must be an integer')
    .custom(async (value, { req }) => {
      const group = await prisma.user.findUnique({ where: { id: +value } });
      if (!group) {
        throw new Error("User ID does not exist");
      }
    }),
];

// Custom middleware to handle validation errors
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export default {
  createUserValidator,
  updateUserValidator,
  deleteUserValidator,
  handleValidationErrors,
}