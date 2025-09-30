import { NextFunction, Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import prisma from "../../lib/prisma.js";

const validateCreateGroup = [
    body("name")
        .notEmpty()
        .withMessage("Group name is required")
        .isString()
        .withMessage("Group name must be a string")
        .custom(async (value) => {
            const existingGroup = await prisma.group.findFirst({ where: { name: value } });
            if (existingGroup) {
                throw new Error("Group name already exists");
            }
        }),
    body("permissionIds")
        .isArray({ min: 1 })
        .withMessage("Permission IDs must be an array with at least one permission")
        .custom(async (value) => {
            const permissions = await prisma.permission.findMany({
                where: { id: { in: value } },
            });

            if (permissions.length !== value.length) {
                throw new Error("One or more Permission IDs do not exist");
            }
        }),
    // validation
];


const validateReadGroups = [
    query("merchant_id")
        .optional()
        .isInt()
        .withMessage("Invalid Merchant ID")
        .custom(async (value) => {
            const merchant = await prisma.merchant.findUnique({ where: { merchant_id: Number(value) } });
            if (!merchant) {
                throw new Error("Merchant ID does not exist");
            }
        }),

    query("groupId")
        .optional()
        .isInt()
        .withMessage("Invalid Group ID")
        .custom(async (value) => {
            const group = await prisma.group.findUnique({ where: { id: Number(value) } });
            if (!group) {
                throw new Error("Group ID does not exist");
            }
        }),
    // validation
];


const validateDeleteGroup = [
    param("groupId")
        .notEmpty()
        .withMessage("Group ID is required")
        .isInt()
        .withMessage("Invalid Group ID")
        .custom(async (value) => {
            const group = await prisma.group.findUnique({ where: { id: Number(value) } });
            if (!group) {
                throw new Error("Group ID does not exist");
            }
        }),
    // validation
];


const validateUpdateGroup = [
    param("groupId")
        .notEmpty()
        .withMessage("Group ID is required")
        .isInt()
        .withMessage("Invalid Group ID format")
        .custom(async (value) => {
            const group = await prisma.group.findUnique({ where: { id: Number(value) } });
            if (!group) {
                throw new Error("Group ID does not exist");
            }
        }),
    body("name")
        .optional()
        .isString()
        .withMessage("Group name must be a string"),
    body("permissionIds")
        .optional()
        .isObject()
        .withMessage("Permission IDs must be an object with 'add' and 'remove' keys")
        .custom((value) => {
            if (!value.add && !value.remove) {
                throw new Error("At least one of 'add' or 'remove' keys must be provided");
            }
            return true;
        }),
    body("permissionIds.add")
        .optional()
        .isArray()
        .withMessage("'add' must be an array of permission IDs")
        .custom(async (value) => {
            if (value.length > 0) {
                const permissions = await prisma.permission.findMany({
                    where: { id: { in: value } },
                });

                if (permissions.length !== value.length) {
                    throw new Error("One or more Permission IDs in 'add' do not exist");
                }
            }
        }),

    body("permissionIds.remove")
        .optional()
        .isArray()
        .withMessage("'remove' must be an array of permission IDs")
        .custom(async (value, { req }) => {
            if (value.length > 0) {
                // Check if permissions exist
                const permissions = await prisma.permission.findMany({
                    where: { id: { in: value } },
                });

                if (permissions.length !== value.length) {
                    throw new Error("One or more Permission IDs in 'remove' do not exist");
                }

                // Check if the permissions are actually assigned to the group
                const existingGroupPermissions = await prisma.groupPermission.findMany({
                    where: {
                        groupId: req.body.groupId,
                        permissionId: { in: value },
                    },
                });

                const existingPermissionIds = existingGroupPermissions.map((gp) => gp.permissionId);
                const missingPermissions = value.filter((id: number) => !existingPermissionIds.includes(id));

                if (missingPermissions.length > 0) {
                    throw new Error(
                        `Permissions ${missingPermissions.join(", ")} are not assigned to this group`
                    );
                }
            }
        }),
    // validation
];

export default {
    validateCreateGroup,
    validateDeleteGroup,
    validateReadGroups,
    validateUpdateGroup,
}