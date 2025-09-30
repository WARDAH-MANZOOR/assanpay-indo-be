// src/services/userService.ts
import bcrypt from "bcrypt";
import { User, UserGroup } from '@prisma/client';
import prisma from "../../lib/prisma.js";

// Create User
export const createUser = async (fullName: string, email: string, password: string, groups: number, merchantId?: number): Promise<User> => {
    const hashedPassword = await bcrypt.hash(password, 10);
    return await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                username: fullName,
                email,
                password: hashedPassword,
            },
        });

        // Then create group associations if groups array exists
        if (groups) {
            await tx.user.update({
                where: { id: user.id },
                data: {
                    groups: {
                        create: {
                            // userId: user.id,
                            groupId: groups,
                            merchantId,
                        }
                        // )
                    // ),
                    },
                },
            });
        }

        return user;
    });

};

// Get User by ID
export const getUsers = async (merchantId: number): Promise<User[] | null> => {
    let usersOfMerchant = await prisma.userGroup.findMany({
        where: {
            merchantId,
        },
        include: {
            user: true,
            group: true,
        },
    });
    usersOfMerchant = usersOfMerchant.filter((user) => user.userId !== merchantId);
    if (!usersOfMerchant) {
        return null
    }
    let users = usersOfMerchant.map((user) => ({
        ...user.user,
        groupName: user.group.name,
        groupId: user.groupId
    }));

    return users;
};

// Update User
export const updateUser = async (userId: number, fullName: string, email: string, merchantId: number, groups?: number, password?: string): Promise<User | null> => {
    const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;
    console.log(merchantId)
    // const user = await prisma.user.findUnique({
    //     where: { id: userId },
    //     include: {
    //         groups: {
    //             include: {
    //                 group: {
    //                     include: {
    //                         permissions: {
    //                             include: {
    //                                 permission: true,
    //                             },
    //                         },
    //                     },
    //                 },
    //             },
    //         },
    //     },
    // });
    // if (user?.groups[0].merchantId !== merchantId) {
    //     return null;
    // }
    const result = await prisma.$transaction(async (tx) => {
        if (groups) {
            await tx.userGroup.updateMany({
                where: {
                    userId,
                    merchantId,
                },
                data: {
                    groupId: groups,
                },
            })
        }
        const updatedUser = await tx.user.update({
            where: {
                id: userId,
                groups: {
                    every: {
                        merchantId,
                    },
                }
            },
            data: {
                username: fullName,
                email,
            },
        });
    
        if (!updatedUser) {
            return null;
        }
        return updatedUser;
    })
    
    return result;
};

// Delete User
export const deleteUser = async (userId: number, merchantId: number): Promise<String> => {
    console.log(userId, merchantId)
    return await prisma.$transaction(async (tx) => {
        const deletedGroup = await tx.userGroup.deleteMany({
            where: {
                userId,
                merchantId,
            },
        });
        const deletedUser = await tx.user.delete({
            where: { id: userId, groups: { every: { merchantId } } },
        });
        return "User deleted successfully";
    })

};

export default {
    createUser,
    getUsers,
    updateUser,
    deleteUser,
}
