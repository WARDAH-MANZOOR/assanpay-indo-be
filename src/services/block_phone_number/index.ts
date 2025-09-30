import { parse } from "date-fns"
import prisma from "../../lib/prisma.js"
import CustomError from "../../utils/custom_error.js"

const addBlockedNumber = async (phone: string[]) => {
    try {
        const existence = await prisma.blockedPhoneNumbers.findMany({
            where: {
                phoneNumber: {in: phone}
            }
        })
        if(existence.length > 0) {
            throw new CustomError("Some Phone Numbers are Already Blocked", 500)
        }
        const record = await prisma.blockedPhoneNumbers.createMany({
            data: phone.map(number => ({
                phoneNumber: number
            }))
        })
        return record;
    }
    catch(err: any) {
        return {
            message: err?.message || "An Error Occured",
            statusCode: err?.message || 500
        }
    }
}

const getBlockedNumbers = async (params: any) => {
    try {
        const phone = params?.phone as string;

        const customWhere = {} as any;

        if (phone) {
            customWhere["phoneNumber"] = phone;
        }

        let { page, limit } = params;
        // Query based on provided parameters
        let skip, take;
        if (page && limit) {
            skip = (+page > 0 ? parseInt(page as string) - 1 : parseInt(page as string)) * parseInt(limit as string);
            take = parseInt(limit as string);
        }
        const transactions = await prisma.blockedPhoneNumbers.findMany({
            ...(skip && { skip: +skip }),
            ...(take && { take: +take }),
            where: {
                ...customWhere,
            }
        });

        let meta = {};
        if (page && take) {
            // Get the total count of transactions
            const total = await prisma.blockedPhoneNumbers.count(
                {
                    where: {
                        ...customWhere,
                    },
                }
            );
            // Calculate the total number of pages
            const pages = Math.ceil(total / +take);
            meta = {
                total,
                pages,
                page: parseInt(page as string),
                limit: take
            }
        }
        const response = {
            numbers: transactions.map((transaction) => ({
                ...transaction,
            })),
            meta,
        };

        return response;
    } catch (err) {
        console.log(err)
        const error = new CustomError("Internal Server Error", 500);
        return error;
    }
};

export default {addBlockedNumber, getBlockedNumbers}