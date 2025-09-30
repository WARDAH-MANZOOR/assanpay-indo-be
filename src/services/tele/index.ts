import prisma from "../../lib/prisma.js"

const getAllWalletAccounts = async () => {
    try {
        const payinxMerchants = await prisma.payinxMerchant.findMany({
            where: {
                merchant: {
                    some: {}
                }
            },
            include: {
                merchant: {
                    select: {
                        full_name: true,
                        merchant_id: true
                    }
                },   
            }
        })
        return {
            payinxMerchants,
        }
    }
    catch (err:any) {
        console.log(JSON.stringify({event: "ERROR", data: err?.message}));
        return {
            message: err?.message || "An Error Occured",
            statusCode: err?.statusCode || 500
        }
    }
}

const getAllWalletAccountWithAMerchant = async () => {
    try {
        const merchants = await prisma.merchant.findMany({
            select: {
                payinxMerchantId: true,
                merchant_id: true,
                full_name: true
            }
        })
        return merchants;
    }
    catch(err: any) {
        return {
            message: err?.message || "An Error Occured",
            statusCode: err?.statusCode || 500
        }
    }
}

export default {
    getAllWalletAccounts,
    getAllWalletAccountWithAMerchant
}